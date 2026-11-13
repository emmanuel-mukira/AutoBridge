import assert from "node:assert/strict";
import { accountWeeklyWork, activityMinutes } from "../dist/src/services/weeklyAllocationService.js";
import { optimizeWeekly } from "../dist/src/services/weeklyOptimization.js";

const start = new Date("2026-11-09T00:00:00Z");
const end = new Date("2026-11-16T00:00:00Z");
const now = new Date("2026-11-12T12:00:00Z");
const item = (id, channel, dueAt, extra = {}) => ({
  id, title: String(id), channel, dueAt: new Date(dueAt), completedAt: null,
  estimatedMinutes: null, appointmentConfirmed: false, opportunityId: id,
  opportunity: { title: String(id) }, client: { businessName: "Demo" }, ...extra,
});
const appointment = item(1, "MEETING", "2026-11-13T09:00:00Z", { appointmentConfirmed: true });
const completed = item(2, "CALL", "2026-11-01T09:00:00Z", { completedAt: now });
const flexible = item(3, "EMAIL", "2026-11-10T09:00:00Z");
const future = item(4, "CALL", "2026-11-17T09:00:00Z");
const unconfirmed = item(5, "SITE_VISIT", "2026-11-13T09:00:00Z");
const work = accountWeeklyWork([appointment, completed, flexible, future, unconfirmed], start, end, now);
assert.equal(work.completedMinutes, 30);
assert.equal(work.pendingMinutes, 195);
assert.deepEqual(work.pending.map((row) => row.id), [1, 3, 5]);
assert.ok(work.overdueIds.has(3));
assert.equal(activityMinutes({ channel: "SITE_VISIT", estimatedMinutes: 45 }), 45);
const afterCompletion = accountWeeklyWork([
  { ...appointment, completedAt: now }, completed, flexible,
], start, end, now);
assert.equal(afterCompletion.completedMinutes, 90);
assert.equal(afterCompletion.pendingMinutes, 15);
assert.equal(work.completedMinutes, 30);
assert.equal(accountWeeklyWork([
  { ...appointment, completedAt: new Date("2026-11-16T00:01:00Z") },
], start, end, now).completedMinutes, 0);
assert.equal(accountWeeklyWork([
  { ...completed, completedAt: new Date("2026-11-08T23:59:00Z") },
], start, end, now).completedMinutes, 0);
const newFollowUp = item(6, "CALL", "2026-11-14T09:00:00Z");
assert.ok(accountWeeklyWork([...work.pending, newFollowUp], start, end, now).pending.some((row) => row.id === 6));
assert.ok(!accountWeeklyWork([{ ...newFollowUp, dueAt: future.dueAt }], start, end, now).pending.length);
assert.equal(accountWeeklyWork([{ ...newFollowUp, completedAt: now }], start, end, now).completedMinutes, 30);
assert.equal(900 - accountWeeklyWork([{ ...newFollowUp, completedAt: now }], start, end, now).completedMinutes, 870);

const candidate = (id, opportunityId, probability, valueUsd, effortMinutes) => ({
  id, opportunityId, title: String(id), clientName: "Demo", channel: "CALL", dueAt: now,
  probability, valueUsd: String(valueUsd),
  expectedValueUsd: (probability * valueUsd).toFixed(2),
  effortMinutes, attention: null,
});
const candidates = [
  candidate(1, 11, 0.9, 100, 60),
  candidate(2, 12, 0.8, 70, 45),
  candidate(3, 13, 0.8, 70, 45),
];
for (const capacity of [0, 120, 240, 480, 900, 1200]) {
  const result = optimizeWeekly(candidates, capacity);
  assert.ok(result.optimal.allocatedMinutes <= capacity);
  assert.ok(result.baselines.every((row) => row.allocatedMinutes <= capacity));
  assert.deepEqual(result, optimizeWeekly(candidates, capacity));
}
assert.deepEqual(optimizeWeekly(candidates, 90).optimal.ids, [2, 3]);
assert.ok(optimizeWeekly([...candidates, candidate(4, 14, 0.95, 100, 30)], 90).optimal.ids.includes(4));
assert.throws(() => optimizeWeekly([candidates[0], { ...candidates[1], opportunityId: 11 }], 120), /INVALID_CANDIDATES/);
console.log("Follow-up accounting, completion-week attribution, all-pending eligibility and knapsack checks passed");
