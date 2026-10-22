import { Prisma, type OpportunityOutcome, type OpportunityStage } from "@prisma/client";
import { prisma } from "../client.js";
import { convertMoneyToUsd, ILLUSTRATIVE_USD_KES_RATE } from "../domain/currency.js";
import type { AnalyticsOverviewQuery } from "../schemas/analytics.schemas.js";
import type { ClientActor } from "./clientService.js";

const stages: OpportunityStage[] = ["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION", "CLOSED"];
const routes = ["FIELDS_SALES", "OTHER", "RESELLER", "TELECOVERAGE", "TELESALES"] as const;

function dateRange(filters: AnalyticsOverviewQuery): Prisma.DateTimeFilter | undefined {
  if (!filters.startDate && !filters.endDate) return undefined;
  return {
    ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
    ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
  };
}

function ownerId(actor: ClientActor, requested?: number) {
  return actor.role === "SALES_REP" ? actor.id : requested;
}

function opportunityScope(actor: ClientActor, filters: AnalyticsOverviewQuery): Prisma.OpportunityWhereInput {
  const scopedOwnerId = ownerId(actor, filters.ownerId);
  return {
    client: { deletedAt: null },
    ...(scopedOwnerId ? { ownerId: scopedOwnerId } : {}),
    ...(dateRange(filters) ? { createdAt: dateRange(filters) } : {}),
    ...(filters.stage ? { stage: filters.stage } : {}),
    ...(filters.outcome ? { outcome: filters.outcome } : {}),
    ...(filters.productGroupId ? { productSubgroup: { productGroupId: filters.productGroupId } } : {}),
  };
}

function activityOwnerScope(actor: ClientActor, filters: AnalyticsOverviewQuery) {
  const scopedOwnerId = ownerId(actor, filters.ownerId);
  return scopedOwnerId ? { ownerId: scopedOwnerId } : {};
}

export class AnalyticsOverviewService {
  async overview(actor: ClientActor, filters: AnalyticsOverviewQuery) {
    const where = opportunityScope(actor, filters);
    const now = new Date();
    const range = dateRange(filters);
    const interactionWhere: Prisma.InteractionWhereInput = {
      client: { deletedAt: null },
      ...(actor.role === "SALES_REP" ? { userId: actor.id } : filters.ownerId ? { client: { deletedAt: null, ownerId: filters.ownerId } } : {}),
      ...(range ? { occurredAt: range } : {}),
    };
    const followUpBase: Prisma.FollowUpWhereInput = {
      client: { deletedAt: null },
      ...activityOwnerScope(actor, filters),
    };
    const start = filters.startDate ? new Date(filters.startDate) : undefined;
    const end = filters.endDate ? new Date(filters.endDate) : undefined;

    const [
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      pipelineByCurrency,
      stageGroups,
      outcomeGroups,
      ownerGroups,
      productGroups,
      routeGroups,
      interactionsRecorded,
      upcomingFollowUps,
      overdueFollowUps,
      completedFollowUps,
      recentOpportunities,
      attentionOpportunities,
      recentInteractions,
    ] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.count({ where: { AND: [where, { outcome: null }] } }),
      prisma.opportunity.count({ where: { AND: [where, { outcome: "WON" }] } }),
      prisma.opportunity.count({ where: { AND: [where, { outcome: "LOST" }] } }),
      prisma.opportunity.groupBy({ by: ["currency"], where: { AND: [where, { outcome: null }] }, _sum: { estimatedAmount: true } }),
      prisma.opportunity.groupBy({ by: ["stage"], where, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["outcome"], where, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["ownerId"], where, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["productSubgroupId"], where, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["routeToMarket"], where, _count: { _all: true } }),
      prisma.interaction.count({ where: interactionWhere }),
      prisma.followUp.count({ where: { ...followUpBase, completedAt: null, dueAt: { gte: now, ...(end ? { lte: end } : {}) } } }),
      prisma.followUp.count({ where: { ...followUpBase, completedAt: null, dueAt: { ...(start ? { gte: start } : {}), lt: now } } }),
      prisma.followUp.count({ where: { ...followUpBase, completedAt: range ?? { not: null } } }),
      prisma.opportunity.findMany({ where, orderBy: { createdAt: "desc" }, take: 5, include: { client: { select: { id: true, businessName: true } }, owner: { select: { id: true, firstName: true, lastName: true } } } }),
      prisma.opportunity.findMany({
        where: { AND: [where, { outcome: null, followUps: { none: { completedAt: null, dueAt: { gte: now } } } }] },
        orderBy: [{ estimatedCloseAt: "asc" }, { updatedAt: "asc" }],
        take: 5,
        include: { client: { select: { id: true, businessName: true } }, owner: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.interaction.findMany({
        where: interactionWhere,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 5,
        include: { client: { select: { id: true, businessName: true } }, opportunity: { select: { id: true, title: true } }, user: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    let openPipelineValueUsd = new Prisma.Decimal(0);
    for (const group of pipelineByCurrency) {
      if (!group._sum.estimatedAmount) continue;
      const converted = convertMoneyToUsd({
        amount: group._sum.estimatedAmount,
        currency: group.currency,
        ...(group.currency === "KES" ? { rate: ILLUSTRATIVE_USD_KES_RATE } : {}),
      });
      openPipelineValueUsd = openPipelineValueUsd.plus(converted.modelReadyAmountUsd);
    }

    const ownerIds = ownerGroups.map((group) => group.ownerId);
    const subgroupIds = productGroups.flatMap((group) => group.productSubgroupId ? [group.productSubgroupId] : []);
    const [owners, subgroups] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, firstName: true, lastName: true } }),
      prisma.productSubgroup.findMany({ where: { id: { in: subgroupIds } }, select: { id: true, productGroup: { select: { id: true, name: true } } } }),
    ]);
    const ownerNames = new Map(owners.map((owner) => [owner.id, `${owner.firstName} ${owner.lastName}`]));
    const subgroupToGroup = new Map(subgroups.map((subgroup) => [subgroup.id, subgroup.productGroup]));
    const byProductGroup = new Map<number | null, { id: number | null; label: string; count: number }>();
    for (const group of productGroups) {
      const productGroup = group.productSubgroupId ? subgroupToGroup.get(group.productSubgroupId) : undefined;
      const id = productGroup?.id ?? null;
      const current = byProductGroup.get(id) ?? { id, label: productGroup?.name ?? "Unspecified", count: 0 };
      current.count += group._count._all;
      byProductGroup.set(id, current);
    }

    const resolved = wonOpportunities + lostOpportunities;
    return {
      scope: { startDate: filters.startDate ?? null, endDate: filters.endDate ?? null, ownerId: ownerId(actor, filters.ownerId) ?? null, isAdmin: actor.role === "ADMIN" },
      summary: {
        totalOpportunities,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        winRate: resolved ? Number(((wonOpportunities / resolved) * 100).toFixed(1)) : null,
        openPipelineValueUsd: openPipelineValueUsd.toFixed(2),
      },
      distributions: {
        byStage: stages.map((stage) => ({ key: stage, count: stageGroups.find((group) => group.stage === stage)?._count._all ?? 0 })),
        byOutcome: [
          ...(["WON", "LOST"] satisfies OpportunityOutcome[]).map((outcome) => ({ key: outcome, count: outcomeGroups.find((group) => group.outcome === outcome)?._count._all ?? 0 })),
          { key: "OPEN", count: outcomeGroups.find((group) => group.outcome === null)?._count._all ?? 0 },
        ],
        byOwner: ownerGroups.map((group) => ({ id: group.ownerId, label: ownerNames.get(group.ownerId) ?? `User ${group.ownerId}`, count: group._count._all })).sort((a, b) => b.count - a.count),
        byProductGroup: [...byProductGroup.values()].sort((a, b) => b.count - a.count),
        byRoute: [
          ...routes.map((route) => ({ key: route, count: routeGroups.find((group) => group.routeToMarket === route)?._count._all ?? 0 })),
          { key: "UNSPECIFIED", count: routeGroups.find((group) => group.routeToMarket === null)?._count._all ?? 0 },
        ],
      },
      activities: { interactionsRecorded, upcomingFollowUps, overdueFollowUps, completedFollowUps },
      recentOpportunities,
      attentionOpportunities,
      recentInteractions,
      currencyBasis: {
        reportingCurrency: "USD",
        kesPerUsd: new Prisma.Decimal(ILLUSTRATIVE_USD_KES_RATE.quoteUnitsPerUsd).toString(),
        source: ILLUSTRATIVE_USD_KES_RATE.source,
        observedAt: ILLUSTRATIVE_USD_KES_RATE.observedAt.toISOString(),
      },
    };
  }
}
