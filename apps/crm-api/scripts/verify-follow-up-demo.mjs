import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/client.js";
import { WeeklyAllocationService } from "../dist/src/services/weeklyAllocationService.js";
import { optimizeWeekly } from "../dist/src/services/weeklyOptimization.js";

const monday = new Date();
monday.setUTCHours(0, 0, 0, 0);
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const weekStart = monday.toISOString().slice(0, 10);
const allocation = new WeeklyAllocationService();
const summary = [];
try {
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP", active: true, approvedAt: { not: null } },
    orderBy: { id: "asc" },
  });
  for (const rep of reps) {
    const clients = await prisma.client.findMany({
      where: { ownerId: rep.id, deletedAt: null,
        shortHistory: "Illustrative automotive sales account for weekly planning." },
    });
    const opportunities = await prisma.opportunity.findMany({
      where: { ownerId: rep.id, title: { startsWith: "Demo:" }, outcome: null },
      include: {
        quotations: { select: { id: true, current: true, items: { select: { id: true } } } },
        predictions: { orderBy: [{ predictedAt: "desc" }, { id: "desc" }], take: 1 },
        interactions: { select: { id: true } },
      },
    });
    const marked = await prisma.followUp.findMany({
      where: { ownerId: rep.id, title: { startsWith: "AUTOBRIDGE_FOLLOW_UP_DEMO" } },
    });
    assert.equal(clients.length, 10);
    assert.ok(opportunities.length >= 23 && opportunities.length <= 27);
    assert.equal(marked.length, 27);
    assert.ok(marked.every((item) => item.opportunityId && item.clientId && item.ownerId === rep.id));
    assert.ok(opportunities.every((item) => item.quotations.length &&
      item.quotations.filter((quote) => quote.current).length === 1 &&
      item.quotations.every((quote) => quote.items.length > 0)));
    const missing = opportunities.filter((item) => item.title.includes("Unscored follow-up"));
    const stale = opportunities.filter((item) => item.title.includes("Stale follow-up"));
    assert.equal(missing.length, 1);
    assert.equal(missing[0].predictions.length, 0);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].predictions[0]?.modelVersion, "automotive_v1");
    const noAction = opportunities.filter((item) => item.title.includes("No-action follow-up"));
    assert.equal(noAction.length, 1);
    const normal = opportunities.filter((item) => !missing.includes(item) && !stale.includes(item));
    assert.ok(normal.every((item) => item.predictions[0]?.modelVersion === "automotive_v1" &&
      item.predictions[0]?.explanation?.status === "available"));
    for (const opportunity of normal) {
      const prediction = opportunity.predictions[0];
      const evidence = prediction.inputSnapshot.revenueEvidence;
      assert.equal(prediction.modelVariant, evidence.state === "UNKNOWN" ? "LIMITED_HISTORY" : "PRIMARY");
      assert.equal("Revenue From Client Past Two Years" in prediction.inputSnapshot.modelReadyFeatures,
        prediction.modelVariant === "PRIMARY");
    }
    const plan = await allocation.plan({ id: rep.id, role: "SALES_REP" }, weekStart);
    assert.ok(plan.completedMinutes >= 90 && plan.pendingMinutes >= 180);
    const demoCandidates = plan.candidates.filter((item) => item.title.startsWith("Demo:"));
    assert.ok(demoCandidates.every((item) => normal.some((opportunity) => opportunity.id === item.opportunityId)));
    assert.equal(new Set(plan.candidates.map((item) => item.id)).size, plan.candidates.length);
    assert.equal(new Set(plan.recommended.map((item) => item.opportunityId)).size, plan.recommended.length);
    assert.ok(plan.recommended.every((item) => item.dueAt >= plan.generatedAt));
    for (const [opportunity, reason] of [[missing[0], "Missing prediction"], [stale[0], "Stale prediction"]]) {
      assert.ok(plan.excluded.some((item) => item.id === opportunity.id && item.reason === reason) ||
        plan.otherPending.some((item) => item.opportunityId === opportunity.id && new Date(item.dueAt) < new Date(plan.generatedAt)) ||
        plan.completed.some((item) => item.opportunityId === opportunity.id));
    }
    assert.ok(plan.withoutFollowUps.some((item) => item.id === noAction[0].id));
    const budgets = [];
    for (const budgetHours of [2, 4, 8, 15, 20]) {
      const flexibleMinutes = Math.max(0, budgetHours * 60 - plan.completedMinutes);
      const overbooked = plan.completedMinutes > budgetHours * 60;
      const result = overbooked ? null : optimizeWeekly(demoCandidates, flexibleMinutes);
      budgets.push({
        budgetHours, overbooked, flexibleMinutes,
        selectedFollowUpIds: result?.optimal.ids ?? [],
        allocatedMinutes: result?.optimal.allocatedMinutes ?? 0,
        unusedMinutes: result ? flexibleMinutes - result.optimal.allocatedMinutes : 0,
        weightedValueUsd: result?.optimal.expectedValueUsd ?? "0.00",
        baselines: result?.baselines.map((row) => ({
          method: row.method, selectedFollowUpIds: row.ids,
          allocatedMinutes: row.allocatedMinutes, weightedValueUsd: row.expectedValueUsd,
        })) ?? [],
      });
      if (result) {
        assert.ok(result.optimal.allocatedMinutes <= flexibleMinutes);
        assert.ok(result.baselines.every((row) => row.allocatedMinutes <= flexibleMinutes));
      }
    }
    summary.push({
      representative: rep.email,
      clients: clients.length,
      opportunities: opportunities.length,
      interactions: opportunities.reduce((sum, item) => sum + item.interactions.length, 0),
      quotations: opportunities.reduce((sum, item) => sum + item.quotations.length, 0),
      markedFollowUps: marked.length,
      genuinePredictions: opportunities.filter((item) => item.predictions.length > 0).length,
      primary: normal.filter((item) => item.predictions[0]?.modelVariant === "PRIMARY").length,
      fallback: normal.filter((item) => item.predictions[0]?.modelVariant === "LIMITED_HISTORY").length,
      completedMinutes: plan.completedMinutes, pendingMinutes: plan.pendingMinutes,
      candidates: demoCandidates.length, budgets,
    });
  }
  console.log(JSON.stringify({ weekStart, summary }, null, 2));
} finally {
  await prisma.$disconnect();
}
