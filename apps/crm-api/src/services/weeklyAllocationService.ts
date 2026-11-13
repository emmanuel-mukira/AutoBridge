import { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import { ClientSalesHistoryService } from "./clientSalesHistoryService.js";
import { buildCurrentScoringInput, predictionMatchesCurrentInput } from "./opportunityScoringInputs.js";
import { followUpMinutes, planningWindow } from "./weeklyPlanningRules.js";
import { optimizeWeekly, type PlanningCandidate } from "./weeklyOptimization.js";
import type { ClientActor } from "./clientService.js";

type PlanningFollowUp = {
  id: number; title: string; channel: string | null; dueAt: Date;
  completedAt: Date | null; estimatedMinutes: number | null;
  appointmentConfirmed: boolean; opportunityId: number | null;
  opportunity: { title: string } | null; client: { businessName: string };
};

export const activityMinutes = (item: Pick<PlanningFollowUp, "channel" | "estimatedMinutes">) =>
  item.estimatedMinutes ?? followUpMinutes(item.channel);

export function accountWeeklyWork(items: PlanningFollowUp[], start: Date, end: Date, now: Date) {
  const completed = items.filter((item) => item.completedAt && item.completedAt >= start && item.completedAt < end);
  const pending = items.filter((item) => !item.completedAt && item.dueAt < end);
  return {
    completed, pending,
    completedMinutes: completed.reduce((sum, item) => sum + activityMinutes(item), 0),
    pendingMinutes: pending.reduce((sum, item) => sum + activityMinutes(item), 0),
    overdueIds: new Set(pending.filter((item) => item.dueAt < now).map((item) => item.id)),
  };
}

const followUpView = (item: PlanningFollowUp) => ({
  id: item.id, title: item.title, opportunityId: item.opportunityId,
  opportunityTitle: item.opportunity?.title ?? null, clientName: item.client.businessName,
  channel: item.channel, dueAt: item.dueAt, effortMinutes: activityMinutes(item),
});

export class WeeklyAllocationService {
  private salesHistory = new ClientSalesHistoryService();
  async ownerId(actor: ClientActor, requested?: number) {
    if (!requested || requested === actor.id) return actor.id;
    if (actor.role !== "ADMIN") throw new Error("FORBIDDEN_OWNER");
    const owner = await prisma.user.findFirst({ where: {
      id: requested, role: "SALES_REP", active: true, approvedAt: { not: null },
    }, select: { id: true } });
    if (!owner) throw new Error("FORBIDDEN_OWNER");
    return owner.id;
  }
  async capacity(userId: number, weekStart: string) {
    return prisma.weeklySalesCapacity.findUnique({ where: { userId_weekStart: {
      userId, weekStart: new Date(`${weekStart}T00:00:00.000Z`),
    } } });
  }
  async saveCapacity(userId: number, weekStart: string, availableMinutes: number) {
    const { start, end } = planningWindow(weekStart);
    if (new Date() >= end) throw new Error("PAST_WEEK");
    return prisma.weeklySalesCapacity.upsert({
      where: { userId_weekStart: { userId, weekStart: start } },
      create: { userId, weekStart: start, availableMinutes },
      update: { availableMinutes },
    });
  }
  async plan(actor: ClientActor, weekStart: string, requestedOwnerId?: number) {
    const userId = await this.ownerId(actor, requestedOwnerId);
    const now = new Date();
    const { start, end } = planningWindow(weekStart);
    if (now >= end) throw new Error("PAST_WEEK");
    const [capacity, followUps, opportunities] = await Promise.all([
      this.capacity(userId, weekStart),
      prisma.followUp.findMany({
        where: { ownerId: userId, client: { deletedAt: null },
          OR: [{ completedAt: { gte: start, lt: end } }, { completedAt: null }],
        },
        include: { opportunity: { select: { title: true } }, client: { select: { businessName: true } } },
        orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      }),
      prisma.opportunity.findMany({
        where: { ownerId: userId, outcome: null, client: { deletedAt: null } },
        include: {
          productSubgroup: { include: { productGroup: true } },
          predictions: { orderBy: [{ predictedAt: "desc" }, { id: "desc" }], take: 1 },
        },
        orderBy: { id: "asc" },
      }),
    ]);
    const work = accountWeeklyWork(followUps, start, end, now);
    const availableMinutes = capacity?.availableMinutes ?? null;
    const remainingMinutes = availableMinutes === null ? null : Math.max(0, availableMinutes - work.completedMinutes);
    const overbooked = availableMinutes !== null && work.completedMinutes > availableMinutes;
    const pendingByOpportunity = new Map<number, PlanningFollowUp>();
    const otherPending: ReturnType<typeof followUpView>[] = [];
    for (const item of work.pending) {
      if (item.opportunityId === null || pendingByOpportunity.has(item.opportunityId))
        otherPending.push(followUpView(item));
      else pendingByOpportunity.set(item.opportunityId, item);
    }
    const evidence = await this.salesHistory.evidenceForClients(
      actor, [...new Set(opportunities.map((item) => item.clientId))], now,
    );
    const candidates: PlanningCandidate[] = [];
    const excluded: { id: number; title: string; reason: string }[] = [];
    const withoutFollowUps: { id: number; title: string }[] = [];
    for (const opportunity of opportunities) {
      const followUp = pendingByOpportunity.get(opportunity.id);
      if (!followUp) {
        if (!followUps.some((item) => item.opportunityId === opportunity.id && !item.completedAt))
          withoutFollowUps.push({ id: opportunity.id, title: opportunity.title });
        continue;
      }
      let reason: string | null = opportunity.stage === "CLOSED" ? "Closed opportunity" : null;
      const prediction = opportunity.predictions[0];
      const revenueEvidence = evidence.get(opportunity.clientId);
      const canScore = Boolean(opportunity.routeToMarket && opportunity.productSubgroup && revenueEvidence &&
        !revenueEvidence.reviewReason &&
        (revenueEvidence.state === "UNKNOWN" || revenueEvidence.ibmRevenueCode !== null));
      const current = canScore && opportunity.routeToMarket && opportunity.productSubgroup && revenueEvidence
        ? buildCurrentScoringInput(opportunity as typeof opportunity & {
            routeToMarket: NonNullable<typeof opportunity.routeToMarket>;
            productSubgroup: NonNullable<typeof opportunity.productSubgroup>;
          }, revenueEvidence, now)
        : null;
      if (!reason && !prediction) reason = "Missing prediction";
      else if (!reason && (!current || !predictionMatchesCurrentInput(prediction!, current)))
        reason = "Stale prediction";
      if (reason) {
        excluded.push({ id: opportunity.id, title: opportunity.title, reason });
        otherPending.push(followUpView(followUp));
        continue;
      }
      const valueUsd = new Prisma.Decimal(current!.conversion.modelReadyAmountUsd);
      if (!valueUsd.isFinite() || valueUsd.isNegative()) {
        excluded.push({ id: opportunity.id, title: opportunity.title, reason: "Invalid estimated value" });
        otherPending.push(followUpView(followUp));
        continue;
      }
      candidates.push({
        id: followUp.id, opportunityId: opportunity.id, title: opportunity.title,
        clientName: followUp.client.businessName, channel: followUp.channel, dueAt: followUp.dueAt,
        probability: Number(prediction!.wonProbability),
        valueUsd: valueUsd.toFixed(2),
        expectedValueUsd: valueUsd.times(prediction!.wonProbability).toFixed(2),
        effortMinutes: activityMinutes(followUp),
        attention: work.overdueIds.has(followUp.id) ? "OVERDUE" : null,
      });
    }
    for (const [opportunityId, followUp] of pendingByOpportunity)
      if (!opportunities.some((item) => item.id === opportunityId)) otherPending.push(followUpView(followUp));
    if (candidates.length > 200) throw new Error("TOO_MANY_CANDIDATES");
    const result = availableMinutes !== null && !overbooked
      ? optimizeWeekly(candidates, remainingMinutes!) : null;
    const recommended = result
      ? candidates.filter((item) => result.optimal.ids.includes(item.id))
        .sort((a, b) => new Prisma.Decimal(b.expectedValueUsd).comparedTo(a.expectedValueUsd) || a.id - b.id)
      : [];
    const unselected = candidates.filter((item) => !result?.optimal.ids.includes(item.id))
      .map((item) => followUpView(followUps.find((followUp) => followUp.id === item.id)!));
    return {
      weekStart, generatedAt: now, availableMinutes,
      completedMinutes: work.completedMinutes, pendingMinutes: work.pendingMinutes,
      remainingMinutes, overbooked,
      completed: work.completed.map(followUpView),
      otherPending: [...otherPending, ...unselected],
      withoutFollowUps, excluded, candidates, recommended,
      allocatedMinutes: result?.optimal.allocatedMinutes ?? 0,
      unusedMinutes: result ? remainingMinutes! - result.optimal.allocatedMinutes : remainingMinutes,
      selectedExpectedValueUsd: result?.optimal.expectedValueUsd ?? "0.00",
      comparisons: result
        ? [{ method: "KNAPSACK", ...result.optimal, improvementPercent: null }, ...result.baselines] : [],
      status: availableMinutes === null ? "CAPACITY_REQUIRED" : overbooked ? "OVERBOOKED" : "READY",
    };
  }
}
