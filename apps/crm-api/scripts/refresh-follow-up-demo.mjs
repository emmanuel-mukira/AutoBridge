import 'dotenv/config';
import assert from 'node:assert/strict';
import { prisma } from '../dist/src/client.js';
import { OpportunityScoringService } from '../dist/src/services/opportunityScoringService.js';
import { WeeklyAllocationService } from '../dist/src/services/weeklyAllocationService.js';

const url = new URL(process.env.DATABASE_URL_ADMIN ?? 'http://invalid');
assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(url.hostname) && /(^|[_-])(dev|development|test)($|[_-])/i.test(url.pathname.slice(1)), 'Only a local development database is allowed');
const now = new Date();
const monday = new Date(now);
monday.setUTCHours(0, 0, 0, 0);
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const marker = `AUTOBRIDGE_WEEK_REFRESH_${monday.toISOString().slice(0, 10)}`;
const durations = [15, 30, 60, 120, 45, 90, 30, 60, 15, 120, 45, 90];
const channels = ['EMAIL', 'CALL', 'MEETING', 'SITE_VISIT'];
const scoring = new OpportunityScoringService();
const allocation = new WeeklyAllocationService();
try {
  const ready = await fetch(`${process.env.ML_API_URL}/ready`, { signal: AbortSignal.timeout(10000) });
  assert.ok(ready.ok, 'ML must be ready before refreshing records');
  const reps = await prisma.user.findMany({where: {role: 'SALES_REP', active: true, approvedAt: {not: null}}, orderBy: {id: 'asc'}, select: {id: true}});
  const fixtures = [];
  for (const rep of reps) {
    const opportunities = await prisma.opportunity.findMany({where: {ownerId: rep.id, outcome: null, stage: {not: 'CLOSED'}, client: {deletedAt: null}}, orderBy: {id: 'asc'}, take: 12, select: {id: true, clientId: true}});
    assert.equal(opportunities.length, 12, `Representative ${rep.id} needs 12 open opportunities`);
    for (const opportunity of opportunities) await scoring.score({id: rep.id, role: 'SALES_REP'}, opportunity.id);
    for (let week = 0; week < 2; week++) {
      const start = new Date(monday.getTime() + week * 7 * 86400000);
      const slots = [];
      for (let day = 0; day < 7; day++) for (const hour of [7, 10, 13]) {
        const slot = new Date(start.getTime() + day * 86400000 + hour * 3600000);
        if (slot > new Date(now.getTime() + 15 * 60000)) slots.push(slot);
      }
      assert.ok(slots.length >= 12, 'Not enough nonoverlapping future slots left this week; run earlier in the week');
      fixtures.push({rep, start, rows: opportunities.map((opportunity, index) => ({
        ownerId: rep.id, clientId: opportunity.clientId, opportunityId: opportunity.id,
        title: `${marker}:week-${week}:action-${index + 1}`, channel: channels[index % channels.length],
        dueAt: slots[index], estimatedMinutes: durations[index], appointmentConfirmed: false,
      }))});
    }
  }
  // Preserve this refresh's rows on repeat runs; complete only the prior pending set.
  const completed = await prisma.$transaction(async (tx) => {
    const result = await tx.followUp.updateMany({where: {completedAt: null, NOT: {title: {startsWith: marker}}}, data: {completedAt: now}});
    for (const fixture of fixtures) {
      await tx.weeklySalesCapacity.upsert({where: {userId_weekStart: {userId: fixture.rep.id, weekStart: fixture.start}}, create: {userId: fixture.rep.id, weekStart: fixture.start, availableMinutes: 1080}, update: {}});
      for (const row of fixture.rows) {
        const exists = await tx.followUp.findFirst({where: {ownerId: row.ownerId, title: row.title}, select: {id: true}});
        if (!exists) await tx.followUp.create({data: row});
      }
    }
    return result.count;
  }, {timeout: 30000});
  const summary = [];
  for (const fixture of fixtures) {
    const week = fixture.start.toISOString().slice(0, 10);
    const plan = await allocation.plan({id: fixture.rep.id, role: 'SALES_REP'}, week);
    assert.equal(plan.prioritizationSource, 'WEEK');
    assert.equal(plan.candidates.length, 12);
    assert.ok(plan.candidates.every((item) => item.dueAt >= fixture.start && item.dueAt < new Date(fixture.start.getTime() + 7 * 86400000)));
    assert.ok(plan.candidates.every((item) => item.probability >= 0 && item.probability <= 1 && item.expectedValueUsd !== undefined));
    assert.ok(plan.allocatedMinutes <= plan.remainingMinutes);
    summary.push({ownerId: fixture.rep.id, week, candidates: plan.candidates.length, recommended: plan.recommended.length, completedHours: plan.completedMinutes / 60, weeklyHours: plan.availableMinutes / 60, remainingHours: plan.remainingMinutes / 60});
  }
  console.log(JSON.stringify({completedExisting: completed, seededOrRetained: fixtures.reduce((n, item) => n + item.rows.length, 0), summary}, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Follow-up refresh failed');
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
