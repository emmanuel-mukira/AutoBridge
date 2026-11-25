import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { optimizeWeekly } from '../dist/src/services/weeklyOptimization.js';
const candidate = (id, group, probability, value, minutes) => ({id, opportunityId:group, probability,
  valueUsd:new Prisma.Decimal(value).toFixed(2), expectedValueUsd:new Prisma.Decimal(value).times(probability).toFixed(2),
  effortMinutes:minutes, title:String(id), clientName:'Synthetic', channel:null, dueAt:new Date('2026-11-23T12:00:00Z'), attention:null});
const methods = r => [r.optimal,...r.baselines];
const density = r => r.baselines.find(b=>b.method==='VALUE_PER_HOUR');
test('four baseline names retain the three existing methods',()=>{
  assert.deepEqual(optimizeWeekly([],0).baselines.map(b=>b.method),['PROBABILITY','VALUE','WEIGHTED_VALUE','VALUE_PER_HOUR']);
});
test('zero capacity yields no selections for every method',()=>{
  for(const r of methods(optimizeWeekly([candidate(1,1,0.5,100,15)],0))){assert.deepEqual(r.ids,[]);assert.equal(r.expectedValueUsd,'0.00');assert.equal(r.allocatedMinutes,0);}
});
test('empty pool has undefined relative improvements',()=>{
  assert.ok(optimizeWeekly([],60).baselines.every(b=>b.improvementPercent===null));
});
test('every method skips activities exceeding capacity',()=>{
  assert.ok(methods(optimizeWeekly([candidate(1,1,0.9,100,60)],15)).every(b=>b.count===0));
});
test('DP chooses two smaller activities over highest individual benefit',()=>{
  const r=optimizeWeekly([candidate(1,1,0.9,100,60),candidate(2,2,0.8,70,45),candidate(3,3,0.8,70,45)],90);
  assert.deepEqual(r.optimal.ids,[2,3]);assert.equal(r.optimal.expectedValueUsd,'112.00');
});
test('alternative actions share a group and cannot be double counted',()=>{
  const rows=[candidate(1,1,0.8,100,60),candidate(2,1,0.8,100,15),candidate(3,2,0.7,100,30)];
  const r=optimizeWeekly(rows,45);assert.deepEqual(r.optimal.ids,[2,3]);
  for(const s of methods(r))assert.equal(new Set(s.ids.map(id=>rows.find(r=>r.id===id).opportunityId)).size,s.count);
});
test('density ranks weighted benefit per duration rather than amount alone',()=>{
  assert.deepEqual(density(optimizeWeekly([candidate(1,1,1,100,60),candidate(2,2,0.8,100,15)],60)).ids,[2]);
});
test('density compares decimal ratios without rounded division',()=>{
  assert.deepEqual(density(optimizeWeekly([candidate(1,1,1,'0.01',30),candidate(2,2,1,'0.01',15)],30)).ids,[2]);
});
test('equal density uses ascending activity ID deterministically',()=>{
  assert.deepEqual(density(optimizeWeekly([candidate(2,2,1,50,30),candidate(1,1,1,100,60)],60)).ids,[1]);
});
test('objective sums stored rounded decimal benefits',()=>{
  assert.equal(optimizeWeekly([candidate(1,1,0.333333,'1.01',15),candidate(2,2,0.333333,'1.01',15)],30).optimal.expectedValueUsd,'0.68');
});
test('all methods respect capacity and DP dominates their feasible values',()=>{
  const rows=Array.from({length:12},(_,i)=>candidate(i+1,Math.floor(i/2)+1,0.4+i/100,100+i*10,15*(1+i%4)));
  for(const c of [0,15,30,90,240,4800]){const r=optimizeWeekly(rows,c);for(const s of methods(r)){assert.ok(s.allocatedMinutes<=c);assert.ok(new Prisma.Decimal(r.optimal.expectedValueUsd).gte(s.expectedValueUsd));}}
});
test('repeat and reversed input produce identical output without mutation',()=>{
  const rows=[candidate(1,1,0.5,100,30),candidate(2,1,0.5,100,15),candidate(3,2,0.5,100,15)];
  const before=JSON.stringify(rows),r=optimizeWeekly(rows,30);assert.deepEqual(r,optimizeWeekly([...rows].reverse(),30));assert.deepEqual(r,optimizeWeekly(rows,30));assert.equal(JSON.stringify(rows),before);
});
test('zero benefit leaves DP empty and greedy improvements undefined',()=>{
  const r=optimizeWeekly([candidate(1,1,0,100,15)],60);assert.deepEqual(r.optimal.ids,[]);assert.ok(r.baselines.every(b=>b.improvementPercent===null));
});
test('reject duplicate IDs, 201 candidates and unsupported capacities',()=>{
  const a=candidate(1,1,0.5,100,15);assert.throws(()=>optimizeWeekly([a,a],60),/INVALID_CANDIDATES/);
  assert.throws(()=>optimizeWeekly(Array.from({length:201},(_,i)=>({...a,id:i+1})),60),/INVALID_CANDIDATES/);
  for(const c of [-15,16,4815])assert.throws(()=>optimizeWeekly([a],c),/INVALID_CAPACITY/);
});
test('200 candidates and 80 hours remain supported',()=>{
  const r=optimizeWeekly(Array.from({length:200},(_,i)=>candidate(i+1,i+1,0.5,100,15)),4800);assert.equal(r.optimal.count,200);assert.equal(r.optimal.expectedValueUsd,'10000.00');
});
test('small grouped instance matches independent integer-cent exhaustive oracle',()=>{
  const rows=[candidate(1,1,0.7,100,45),candidate(2,1,0.7,100,15),candidate(3,2,0.8,99,30),candidate(4,3,0.3,220,15)];
  for(const capacity of [0,15,30,45,60]){
    let best=0n;
    for(let mask=0;mask<2**rows.length;mask++){
      const selected=rows.filter((_,i)=>mask&(1<<i));
      if(new Set(selected.map(r=>r.opportunityId)).size!==selected.length||selected.reduce((s,r)=>s+r.effortMinutes,0)>capacity)continue;
      const value=selected.reduce((s,r)=>s+BigInt(new Prisma.Decimal(r.expectedValueUsd).times(100).toFixed(0)),0n);if(value>best)best=value;
    }
    assert.equal(BigInt(new Prisma.Decimal(optimizeWeekly(rows,capacity).optimal.expectedValueUsd).times(100).toFixed(0)),best);
  }
});
