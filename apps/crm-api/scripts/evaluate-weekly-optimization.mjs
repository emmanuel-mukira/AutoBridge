// Offline, synthetic evaluation of the compiled production optimizer; no client or DB imports.
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { optimizeWeekly } from '../dist/src/services/weeklyOptimization.js';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { performance } from 'node:perf_hooks';

const out = fileURLToPath(new URL('../../../docs/testing/optimization-evaluation/', import.meta.url));
mkdirSync(out, { recursive: true });
const save = (name, data) => writeFileSync(out + name, JSON.stringify(data, null, 2) + '\n');
const hash = data => createHash('sha256').update(data).digest('hex');
const config = {
  seed: 20261125, scenarios: 500, counts: [10, 25, 50, 100, 200],
  capacitiesMinutes: [60, 240, 480, 960, 1500, 2400, 4800],
  durationsMinutes: [15, 30, 60, 90, 120, 180, 240],
  amountUsd: { min: 100, max: 100000, distribution: 'log-uniform, cents rounded' },
  probability: { min: 0.05, max: 0.95, distribution: 'uniform, six decimal places' },
  alternatives: 'uniform integer 1..3 per opportunity; shared value and probability within group',
  completed: 'uniform integer 0..floor(weeklyCapacitySlots/2), estimated effort; deducted before selection',
  edges: 'first four of each 100-count block: zero remaining, all activities too long, zero benefits, tied benefits',
  exhaustiveInstances: 250, exhaustiveMaxActivities: 12,
  runtime: { warmups: 5, repetitions: 30, capacitiesMinutes: [60, 1500, 4800] },
  units: 'USD probability-weighted planning value; minutes; 15-minute multiples',
  eligibility: 'pre-eligible synthetic pool, same immutable array and remaining capacity for all methods; no CRM inference',
  assumptions: 'Illustrative distributions within production limits, not fitted to IBM or organizational sales. Defaults 15/30/60/120 min and custom durations are supported by planning rules.',
};
// Persist the design before generation or measurement, independent of the resulting comparisons.
save('protocol.json', config);
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(config.seed);
const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = values => values[integer(0, values.length - 1)];
function candidates(n, edge = '') {
  const rows = [];
  let group = 0;
  while (rows.length < n) {
    group++;
    const probability = edge === 'zero-benefits' ? 0 : edge === 'ties' ? 0.5 : Number((0.05 + random() * 0.9).toFixed(6));
    const valueUsd = edge === 'ties' ? '1000.00' : (10 ** (2 + random() * 3)).toFixed(2);
    const benefit = new Prisma.Decimal(valueUsd).times(probability).toFixed(2);
    for (let k = integer(1, 3); k > 0 && rows.length < n; k--) {
      rows.push({ id: rows.length + 1, opportunityId: group, title: `Synthetic ${group}`, clientName: 'Synthetic',
        channel: null, dueAt: new Date('2026-11-23T12:00:00Z'), probability, valueUsd,
        expectedValueUsd: benefit, effortMinutes: edge === 'too-long' ? pick([30, 60, 120, 240]) : pick(config.durationsMinutes), attention: null });
    }
  }
  return rows;
}
const scenarios = [];
for (const n of config.counts) {
  for (let i = 0; i < 100; i++) {
    const edge = ['zero-capacity', 'too-long', 'zero-benefits', 'ties'][i] ?? '';
    const weeklyMinutes = pick(config.capacitiesMinutes);
    const completedMinutes = edge === 'zero-capacity' ? weeklyMinutes : edge === 'too-long' ? weeklyMinutes - 15 : integer(0, Math.floor(weeklyMinutes / 30)) * 15;
    scenarios.push({ id: scenarios.length + 1, edge: edge || 'random', weeklyMinutes, completedMinutes,
      remainingMinutes: Math.max(0, weeklyMinutes - completedMinutes), candidates: candidates(n, edge) });
  }
}
save('scenarios.json', scenarios);
const scenariosHash = hash(readFileSync(out + 'scenarios.json'));
const cents = value => BigInt(new Prisma.Decimal(value).times(100).toFixed(0));
const dollars = value => new Prisma.Decimal(value.toString()).div(100).toFixed(2);
function feasible(selection, rows, capacity) {
  const selected = selection.ids.map(id => rows.find(row => row.id === id));
  const valid = selected.every(Boolean) && new Set(selection.ids).size === selection.ids.length;
  if (!valid) return false;
  const duration = selected.reduce((sum, row) => sum + row.effortMinutes, 0);
  const value = selected.reduce((sum, row) => sum + cents(row.expectedValueUsd), 0n);
  return duration <= capacity && duration === selection.allocatedMinutes && value === cents(selection.expectedValueUsd)
    && new Set(selected.map(row => row.opportunityId)).size === selected.length && selection.count === selected.length;
}
const results = scenarios.map(scenario => {
  const before = JSON.stringify(scenario.candidates);
  const result = optimizeWeekly(scenario.candidates, scenario.remainingMinutes);
  assert.equal(JSON.stringify(scenario.candidates), before, 'Optimizer mutated the shared input');
  const methods = [{ method: 'MCKP', ...result.optimal }, ...result.baselines].map(selection => ({
    ...selection, feasible: feasible(selection, scenario.candidates, scenario.remainingMinutes),
  }));
  for (const selection of methods) {
    assert.ok(selection.feasible, `Infeasible ${scenario.id}/${selection.method}`);
    assert.ok(cents(result.optimal.expectedValueUsd) >= cents(selection.expectedValueUsd), `Greedy exceeds DP in ${scenario.id}`);
  }
  assert.deepEqual(result, optimizeWeekly([...scenario.candidates].reverse(), scenario.remainingMinutes), 'Input order changed deterministic output');
  return { scenarioId: scenario.id, edge: scenario.edge, candidateCount: scenario.candidates.length,
    groupCount: new Set(scenario.candidates.map(row => row.opportunityId)).size,
    weeklyMinutes: scenario.weeklyMinutes, completedMinutes: scenario.completedMinutes, capacityMinutes: scenario.remainingMinutes, methods };
});
save('scenario-results.json', results);
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const quantile = (xs, q) => { const s = [...xs].sort((a,b) => a-b); return s[Math.max(0, Math.ceil(q * s.length) - 1)]; };
const median = xs => { const s = [...xs].sort((a,b) => a-b); const m = Math.floor(s.length/2); return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
const stats = xs => ({ mean: mean(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs) });
const methodNames = results[0].methods.map(row => row.method);
const summaries = methodNames.map(method => {
  const values = results.map(s => s.methods.find(r => r.method === method));
  const differences = results.map((s, i) => cents(s.methods[0].expectedValueUsd) - cents(values[i].expectedValueUsd));
  const relative = differences.flatMap((d, i) => cents(values[i].expectedValueUsd) === 0n ? [] : [Number(new Prisma.Decimal(d.toString()).div(cents(values[i].expectedValueUsd).toString()).times(100))]);
  const wins = differences.filter(d => d > 0n).length;
  const ties = differences.filter(d => d === 0n).length;
  return { method, scenarios: values.length, valueUsd: stats(values.map(v => Number(v.expectedValueUsd))),
    absoluteGapUsd: stats(differences.map(d => Number(dollars(d)))),
    improvementOverMethodPercent: relative.length ? stats(relative) : null,
    definedPercentageCases: relative.length, zeroDenominatorCases: values.length - relative.length,
    zeroDenominatorStrictWins: differences.filter((d,i) => d > 0n && cents(values[i].expectedValueUsd) === 0n).length,
    strictWins: wins, strictWinPercent: wins / values.length * 100, ties, tiePercent: ties / values.length * 100,
    greedyBeatsMckp: differences.filter(d => d < 0n).length,
    feasibilityViolations: values.filter(v => !v.feasible).length };
});
// Independent integer-cent exhaustive oracle, not used by the production solver or scenarios.
function exhaustive(rows, capacity) {
  let best = 0n;
  for (let mask = 0; mask < 2 ** rows.length; mask++) {
    let minutes = 0, value = 0n, valid = true;
    const groups = new Set();
    for (let j = 0; j < rows.length; j++) if (mask & (1 << j)) {
      const row = rows[j];
      if (groups.has(row.opportunityId)) { valid = false; break; }
      groups.add(row.opportunityId); minutes += row.effortMinutes;
      if (minutes > capacity) { valid = false; break; }
      value += cents(row.expectedValueUsd);
    }
    if (valid && value > best) best = value;
  }
  return best;
}
const optimality = [];
for (let i = 0; i < config.exhaustiveInstances; i++) {
  const rows = candidates(1 + i % 12, i % 25 === 0 ? 'ties' : i % 25 === 1 ? 'zero-benefits' : '');
  const capacity = i % 25 === 2 ? 0 : pick([15, 30, 60, 120, 240, 480]);
  const result = optimizeWeekly(rows, capacity).optimal;
  const oracle = exhaustive(rows, capacity);
  optimality.push({ id: i+1, capacityMinutes: capacity, candidates: rows,
    exhaustiveValueUsd: dollars(oracle), production: result,
    feasible: feasible(result, rows, capacity), objectiveEqual: cents(result.expectedValueUsd) === oracle });
}
save('optimality-results.json', optimality);
const runtime = [];
for (const n of config.counts) {
  const rows = scenarios.find(s => s.candidates.length === n && s.edge === 'random').candidates;
  for (const capacity of config.runtime.capacitiesMinutes) {
    for (let i=0; i<config.runtime.warmups; i++) optimizeWeekly(rows, capacity);
    const timingsMs = [];
    for (let i=0; i<config.runtime.repetitions; i++) {
      const start = performance.now();
      optimizeWeekly(rows, capacity);
      timingsMs.push(performance.now() - start);
    }
    runtime.push({ candidateCount: n, groupCount: new Set(rows.map(r => r.opportunityId)).size,
      capacityMinutes: capacity, repetitions: timingsMs.length, warmups: config.runtime.warmups,
      medianMs: median(timingsMs), p95Ms: quantile(timingsMs, 0.95), timingsMs });
  }
}
save('runtime-results.json', runtime);
const summary = { config, scenariosSha256: scenariosHash, summaries,
  percentageDefinition: '(MCKP - baseline) / baseline * 100; mean/median/min/max over defined cases only; zero baselines excluded and counted separately',
  frequencyDenominator: 'all 500 scenarios, including zero-capacity, zero-benefit and all-too-long cases',
  optimality: { tested: optimality.length, passed: optimality.filter(r => r.objectiveEqual && r.feasible).length,
    failed: optimality.filter(r => !r.objectiveEqual || !r.feasible).length }, runtime,
  runtimeScope: 'Whole optimizeWeekly call including DP, backtracking, summaries and four greedy comparisons; no DB or inference; local warm-process single-thread measurements',
  environment: { node: process.version, prisma: Prisma.prismaVersion.client, platform: process.platform,
    release: os.release(), architecture: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length,
    memoryBytes: os.totalmem(), optimizerSha256: hash(readFileSync(new URL('../src/services/weeklyOptimization.ts', import.meta.url))),
    scriptSha256: hash(readFileSync(fileURLToPath(import.meta.url))) },
};
save('summary.json', summary);
const csv = ['scenario,edge,candidates,groups,capacityMinutes,method,valueUsd,allocatedMinutes,feasible,ids'];
for (const s of results) for (const r of s.methods) csv.push([s.scenarioId,s.edge,s.candidateCount,s.groupCount,s.capacityMinutes,r.method,r.expectedValueUsd,r.allocatedMinutes,r.feasible,`"${r.ids.join(';')}"`].join(','));
writeFileSync(out+'scenario-results.csv', csv.join('\n')+'\n');
console.log(JSON.stringify({ seed: config.seed, scenarios: results.length, scenarioHash: scenariosHash,
  comparisons: summaries, optimality: summary.optimality, runtime: runtime.map(({timingsMs,...r}) => r) }, null, 2));
assert.equal(summary.optimality.failed, 0, 'Exhaustive discrepancy: inspect retained results');
