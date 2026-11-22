import 'dotenv/config';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma } from '../dist/src/client.js';
import { OpportunityScoringService } from '../dist/src/services/opportunityScoringService.js';
import { WeeklyAllocationService } from '../dist/src/services/weeklyAllocationService.js';
import { optimizeWeekly } from '../dist/src/services/weeklyOptimization.js';

const url = new URL(process.env.DATABASE_URL_ADMIN ?? 'http://invalid');
assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(url.hostname) && /(^|[_-])(dev|development|test)($|[_-])/i.test(url.pathname.slice(1)), 'Local development database required');
const week = '2026-11-23';
const start = new Date(`${week}T00:00:00Z`);
const end = new Date(start.getTime() + 7 * 86400000);
assert.ok(new Date() < start, 'Configure this dated demonstration before its week begins');
// A deliberately constrained demonstration, with genuine model outputs and illustrative effort estimates.
const durations = new Map([[143,120],[144,240],[145,90],[146,210],[147,240],[208,210],[209,120],[210,150],[211,90],[212,240],[213,90],[214,240],[215,240],[216,210],[217,210],[218,150],[219,150],[220,210],[221,210],[222,120]]);
const service = new WeeklyAllocationService();
try {
  const rep = await prisma.user.findFirstOrThrow({where: {email: 'weekly.planner@autobridge.local', active: true}, select: {id: true}});
  const actor = {id: rep.id, role: 'SALES_REP'};
  const before = await service.plan(actor, week);
  assert.equal(before.completedMinutes, 0, 'Do not overwrite a demonstration already in progress');
  const existing = await prisma.followUp.findMany({where: {ownerId: rep.id, dueAt: {gte: start, lt: end}}});
  assert.ok(existing.every(row => !row.completedAt && (row.title.startsWith('Knapsack demo:') || row.title.startsWith('AUTOBRIDGE_WEEK_REFRESH_')) && durations.has(row.opportunityId)), 'Only labelled demo follow-ups may change');
  const opportunities = await prisma.opportunity.findMany({where: {id: {in: [...durations.keys()]}, ownerId: rep.id, outcome: null, stage: {not: 'CLOSED'}, title: {startsWith: 'Demo:'}, client: {deletedAt: null}}, orderBy: {id: 'asc'}});
  assert.equal(opportunities.length, durations.size);
  const scoring = new OpportunityScoringService();
  const proposed = [];
  const dailyMinutes = Array(7).fill(0);
  const slots = new Map();
  for (const [id, minutes] of [...durations].sort((a,b) => b[1]-a[1])) {
    const day = dailyMinutes.findIndex(used => used + minutes <= 540);
    assert.ok(day >= 0, 'Demonstration must fit daytime slots without overlaps');
    slots.set(id, new Date(start.getTime() + day * 86400000 + (300 + dailyMinutes[day]) * 60000));
    dailyMinutes[day] += minutes;
  }
  for (const opportunity of opportunities) {
    const prediction = await scoring.score(actor, opportunity.id);
    assert.ok(prediction, `Missing actual prediction for ${opportunity.id}`);
    const minutes = durations.get(opportunity.id);
    // Nonoverlapping daytime slots, 08:00–17:00 Nairobi, across the selected week.
    const valueUsd = new Prisma.Decimal(prediction.conversionSnapshot.modelReadyAmountUsd).toFixed(2);
    proposed.push({id: existing.find(row => row.opportunityId === opportunity.id)?.id ?? opportunity.id + 100000,
      opportunityId: opportunity.id, clientId: opportunity.clientId, title: opportunity.title, clientName: '',
      channel: minutes <= 120 ? 'MEETING' : 'SITE_VISIT', effortMinutes: minutes,
      dueAt: slots.get(opportunity.id),
      probability: Number(prediction.wonProbability), valueUsd,
      expectedValueUsd: new Prisma.Decimal(prediction.conversionSnapshot.modelReadyAmountUsd).times(prediction.wonProbability).toFixed(2), attention: null});
  }
  const results = [];
  for (let minutes = 1200; minutes <= 2400; minutes += 15) {
    const result = optimizeWeekly(proposed, minutes);
    assert.ok(result.baselines.every(row => new Prisma.Decimal(row.expectedValueUsd).lt(result.optimal.expectedValueUsd)), `Strict improvement not achieved at ${minutes / 60} hours; review this demonstration`);
    results.push({hours: minutes / 60, result});
  }
  await prisma.$transaction(async tx => {
    for (const row of proposed) {
      const data = {ownerId: rep.id, clientId: row.clientId, opportunityId: row.opportunityId,
        title: `Knapsack demo: ${row.channel === 'SITE_VISIT' ? 'On-site assessment' : 'Requirements meeting'} — ${row.title.replace(/^Demo: /, '')}`,
        channel: row.channel, dueAt: row.dueAt, estimatedMinutes: row.effortMinutes, appointmentConfirmed: false};
      const previous = existing.filter(item => item.opportunityId === row.opportunityId);
      assert.ok(previous.length <= 1, 'Unexpected duplicate demo follow-ups');
      if (previous.length) await tx.followUp.update({where: {id: previous[0].id}, data});
      else await tx.followUp.create({data});
    }
    await tx.weeklySalesCapacity.upsert({where: {userId_weekStart: {userId: rep.id, weekStart: start}},
      create: {userId: rep.id, weekStart: start, availableMinutes: 1800}, update: {availableMinutes: 1800}});
  }, {timeout: 30000});
  const plan = await service.plan(actor, week);
  assert.equal(plan.candidates.length, 20);
  assert.equal(plan.remainingMinutes, 1800);
  assert.equal(plan.selectedExpectedValueUsd, results.find(row => row.hours === 30).result.optimal.expectedValueUsd);
  const ordered = [...plan.candidates].sort((a,b) => a.dueAt-b.dueAt);
  for (let i=1;i<ordered.length;i++) assert.ok(ordered[i-1].dueAt.getTime()+ordered[i-1].effortMinutes*60000 <= ordered[i].dueAt.getTime());
  console.log(JSON.stringify({account:'weekly.planner@autobridge.local', week, weeklyHours:30,
    pendingHours: proposed.reduce((sum,row) => sum+row.effortMinutes,0)/60, verifiedQuarterHourBudgets: results.length,
    comparisons: results.filter(row => row.hours % 5 === 0).map(({hours,result}) => ({hours,
      knapsackUsd: result.optimal.expectedValueUsd,
      baselines: result.baselines.map(row => ({method:row.method, valueUsd:row.expectedValueUsd,
        shareOfOptimum: Number((Number(row.expectedValueUsd)/Number(result.optimal.expectedValueUsd)*100).toFixed(1))}))}))},null,2));
} catch(error) { console.error(error.message); process.exitCode=1; }
finally { await prisma.$disconnect(); }
