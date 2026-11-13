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
const totals = {
  reps: 0,
  clients: 0,
  opportunities: 0,
  interactions: 0,
  followUps: 0,
  primary: 0,
  fallback: 0,
};

try {
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP", active: true, approvedAt: { not: null } },
  });
  for (const rep of reps) {
    const clients = await prisma.client.findMany({
      where: {
        ownerId: rep.id,
        deletedAt: null,
        shortHistory:
          "Illustrative automotive sales account for weekly planning.",
      },
    });
    const opportunities = await prisma.opportunity.findMany({
      where: {
        ownerId: rep.id,
        title: { startsWith: "Demo:" },
        outcome: null,
      },
      include: {
        client: true,
        quotations: { select: { id: true, clientId: true, current: true, items: { select: { id: true } } } },
        predictions: {
          orderBy: [{ predictedAt: "desc" }, { id: "desc" }],
          take: 1,
        },
      },
    });
    assert.equal(clients.length, 10);
    assert.ok(opportunities.length >= 20 && opportunities.length <= 25);
    assert.deepEqual(
      new Set(opportunities.map((item) => item.stage)),
      new Set(["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION"]),
    );
    const ids = opportunities.map((item) => item.id);
    const interactions = await prisma.interaction.findMany({
      where: {
        opportunityId: { in: ids },
        notes: { startsWith: "AUTOBRIDGE_WEEKLY_DEMO:" },
      },
    });
    const followUps = await prisma.followUp.findMany({
      where: { opportunityId: { in: ids } },
    });
    assert.ok(interactions.length >= 17 && followUps.length >= 6);
    assert.ok(interactions.every((item) => item.userId === rep.id));
    assert.ok(followUps.every((item) => item.ownerId === rep.id));
    const plan = await allocation.plan(
      { id: rep.id, role: "SALES_REP" },
      weekStart,
    );
    for (const item of opportunities) {
      assert.equal(item.client.ownerId, rep.id);
      assert.ok(item.quotations.length > 0);
      assert.equal(item.quotations.filter((quotation) => quotation.current).length, 1);
      assert.ok(item.quotations.every((quotation) => quotation.clientId === item.clientId && quotation.items.length > 0));
      assert.ok(
        item.productSubgroupId &&
          item.routeToMarket &&
          item.estimatedAmount.greaterThan(0),
      );
      assert.ok(plan.candidates.some((candidate) => candidate.id === item.id));
      const prediction = item.predictions[0];
      assert.equal(prediction?.modelVersion, "automotive_v1");
      assert.equal(prediction?.explanation?.status, "available");
      assert.ok(
        prediction.inputSnapshot?.scoringIdentity &&
          prediction.inputSnapshot?.modelReadyFeatures,
      );
      assert.equal(
        Object.keys(prediction.inputSnapshot.modelReadyFeatures).length,
        prediction.modelVariant === "PRIMARY" ? 5 : 4,
      );
      if (prediction.modelVariant === "PRIMARY") totals.primary += 1;
      else {
        assert.equal(prediction.modelVariant, "LIMITED_HISTORY");
        totals.fallback += 1;
      }
    }
    assert.ok(plan.candidates.some((item) => item.attention === "OVERDUE"));
    assert.ok(plan.candidates.some((item) => item.attention === "INACTIVE"));
    assert.ok(
      plan.candidates.some(
        (item) =>
          item.title.includes("Coastal recovery equipment") &&
          item.attention === null,
      ),
    );
    assert.ok(
      plan.candidates.some(
        (item) =>
          item.attention === "OVERDUE" &&
          item.action === "OVERDUE" &&
          item.overdueFollowUpId,
      ),
    );
    assert.ok(
      plan.candidates.some(
        (item) => item.committedEffortMinutes > 0 && item.effortMinutes === 0,
      ),
    );
    totals.reps += 1;
    totals.clients += clients.length;
    totals.opportunities += opportunities.length;
    totals.interactions += interactions.length;
    totals.followUps += followUps.length;
    if (rep.email === "weekly.planner@autobridge.local") {
      for (const budgetHours of [2, 4, 8, 16]) {
        const remainingMinutes = budgetHours * 60 - plan.completedMinutes;
        assert.ok(remainingMinutes >= 0);
        const candidates = plan.candidates.filter(
          (item) => item.effortMinutes > 0,
        );
        const result = optimizeWeekly(candidates, remainingMinutes);
        assert.deepEqual(result, optimizeWeekly(candidates, remainingMinutes));
        assert.ok(result.optimal.allocatedMinutes <= remainingMinutes);
        console.log(
          JSON.stringify({
            budgetHours,
            completedMinutes: plan.completedMinutes,
            remainingMinutes,
            knapsack: result.optimal,
            baselines: result.baselines,
          }),
        );
      }
    }
  }
  assert.ok(totals.primary > 0 && totals.fallback > 0);
  console.log("Verified demo totals:", totals);
} finally {
  await prisma.$disconnect();
}
