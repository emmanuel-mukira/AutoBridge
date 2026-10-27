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
    ...(filters.stage ? { stage: filters.stage } : {}),
    ...(filters.productGroupId ? { productSubgroup: { productGroupId: filters.productGroupId } } : {}),
  };
}

function activityOwnerScope(actor: ClientActor, filters: AnalyticsOverviewQuery) {
  const scopedOwnerId = ownerId(actor, filters.ownerId);
  return scopedOwnerId ? { ownerId: scopedOwnerId } : {};
}

function rate(won: number, lost: number) {
  const resolved = won + lost;
  return resolved ? Number(((won / resolved) * 100).toFixed(1)) : null;
}

export class AnalyticsOverviewService {
  async overview(actor: ClientActor, filters: AnalyticsOverviewQuery) {
    const baseWhere = opportunityScope(actor, filters);
    const range = dateRange(filters);
    const createdWhere: Prisma.OpportunityWhereInput = {
      AND: [baseWhere, ...(range ? [{ createdAt: range }] : []), ...(filters.outcome ? [{ outcome: filters.outcome }] : [])],
    };
    const outcomeWhere: Prisma.OpportunityWhereInput = {
      AND: [baseWhere, { outcome: { in: ["WON", "LOST"] } }, ...(range ? [{ outcomeAt: range }] : [])],
    };
    const openWhere: Prisma.OpportunityWhereInput = { AND: [baseWhere, { outcome: null }] };
    const now = new Date();
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
      totalOpportunities, openOpportunities, wonOpportunities, lostOpportunities,
      pipelineByCurrency, stageGroups, outcomeGroups, ownerCreatedGroups, ownerOutcomeGroups,
      productVolumeGroups, productGroups, routeGroups, interactionsRecorded, upcomingFollowUps, overdueFollowUps,
      completedFollowUps, recentOpportunities, attentionOpportunities, recentInteractions,
    ] = await Promise.all([
      prisma.opportunity.count({ where: createdWhere }),
      prisma.opportunity.count({ where: openWhere }),
      prisma.opportunity.count({ where: { AND: [outcomeWhere, { outcome: "WON" }] } }),
      prisma.opportunity.count({ where: { AND: [outcomeWhere, { outcome: "LOST" }] } }),
      prisma.opportunity.groupBy({ by: ["currency"], where: openWhere, _sum: { estimatedAmount: true } }),
      prisma.opportunity.groupBy({ by: ["stage"], where: createdWhere, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["outcome"], where: outcomeWhere, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["ownerId"], where: createdWhere, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["ownerId", "outcome"], where: outcomeWhere, _count: { _all: true }, _sum: { confirmedAmountUsd: true } }),
      prisma.opportunity.groupBy({ by: ["productSubgroupId"], where: createdWhere, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["productSubgroupId", "outcome"], where: outcomeWhere, _count: { _all: true } }),
      prisma.opportunity.groupBy({ by: ["routeToMarket", "outcome"], where: outcomeWhere, _count: { _all: true } }),
      prisma.interaction.count({ where: interactionWhere }),
      prisma.followUp.count({ where: { ...followUpBase, completedAt: null, dueAt: { gte: now, ...(end ? { lte: end } : {}) } } }),
      prisma.followUp.count({ where: { ...followUpBase, completedAt: null, dueAt: { ...(start ? { gte: start } : {}), lt: now } } }),
      prisma.followUp.count({ where: { ...followUpBase, completedAt: range ?? { not: null } } }),
      prisma.opportunity.findMany({ where: createdWhere, orderBy: { createdAt: "desc" }, take: 5, include: { client: { select: { id: true, businessName: true } }, owner: { select: { id: true, firstName: true, lastName: true } } } }),
      prisma.opportunity.findMany({
        where: { AND: [openWhere, { followUps: { none: { completedAt: null, dueAt: { gte: now } } } }] },
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
      const converted = convertMoneyToUsd({ amount: group._sum.estimatedAmount, currency: group.currency, ...(group.currency === "KES" ? { rate: ILLUSTRATIVE_USD_KES_RATE } : {}) });
      openPipelineValueUsd = openPipelineValueUsd.plus(converted.modelReadyAmountUsd);
    }

    const ownerIds = [...new Set([...ownerCreatedGroups.map((group) => group.ownerId), ...ownerOutcomeGroups.map((group) => group.ownerId)])];
    const subgroupIds = [...new Set([...productVolumeGroups, ...productGroups].flatMap((group) => group.productSubgroupId ? [group.productSubgroupId] : []))];
    const [owners, subgroups] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, firstName: true, lastName: true } }),
      prisma.productSubgroup.findMany({ where: { id: { in: subgroupIds } }, select: { id: true, productGroup: { select: { id: true, name: true } } } }),
    ]);
    const ownerNames = new Map(owners.map((owner) => [owner.id, `${owner.firstName} ${owner.lastName}`]));
    const subgroupToGroup = new Map(subgroups.map((subgroup) => [subgroup.id, subgroup.productGroup]));
    const byProductGroup = new Map<number | null, { id: number | null; label: string; won: number; lost: number }>();
    for (const group of productVolumeGroups) {
      const productGroup = group.productSubgroupId ? subgroupToGroup.get(group.productSubgroupId) : undefined;
      const id = productGroup?.id ?? null;
      if (!byProductGroup.has(id)) byProductGroup.set(id, { id, label: productGroup?.name ?? "Unspecified", won: 0, lost: 0 });
    }
    for (const group of productGroups) {
      const productGroup = group.productSubgroupId ? subgroupToGroup.get(group.productSubgroupId) : undefined;
      const id = productGroup?.id ?? null;
      const current = byProductGroup.get(id) ?? { id, label: productGroup?.name ?? "Unspecified", won: 0, lost: 0 };
      if (group.outcome === "WON") current.won += group._count._all;
      if (group.outcome === "LOST") current.lost += group._count._all;
      byProductGroup.set(id, current);
    }

    const byOwner = ownerIds.map((id) => {
      const won = ownerOutcomeGroups.find((group) => group.ownerId === id && group.outcome === "WON");
      const lost = ownerOutcomeGroups.find((group) => group.ownerId === id && group.outcome === "LOST");
      const wonCount = won?._count._all ?? 0;
      const lostCount = lost?._count._all ?? 0;
      return {
        id,
        label: ownerNames.get(id) ?? `User ${id}`,
        count: ownerCreatedGroups.find((group) => group.ownerId === id)?._count._all ?? 0,
        won: wonCount,
        lost: lostCount,
        resolved: wonCount + lostCount,
        winRate: rate(wonCount, lostCount),
        confirmedWonValueUsd: (won?._sum.confirmedAmountUsd ?? new Prisma.Decimal(0)).toFixed(2),
      };
    }).sort((a, b) => b.resolved - a.resolved || b.count - a.count);

    return {
      scope: {
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null,
        ownerId: ownerId(actor, filters.ownerId) ?? null,
        isAdmin: actor.role === "ADMIN",
        dateSemantics: { createdOpportunities: "createdAt", resolvedOutcomes: "outcomeAt", openPipeline: "current" },
      },
      summary: {
        totalOpportunities,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        winRate: rate(wonOpportunities, lostOpportunities),
        openPipelineValueUsd: openPipelineValueUsd.toFixed(2),
      },
      distributions: {
        byStage: stages.map((stage) => ({ key: stage, count: stageGroups.find((group) => group.stage === stage)?._count._all ?? 0 })),
        byOutcome: [
          ...(["WON", "LOST"] satisfies OpportunityOutcome[]).map((outcome) => ({ key: outcome, count: outcomeGroups.find((group) => group.outcome === outcome)?._count._all ?? 0 })),
          { key: "OPEN", count: openOpportunities },
        ],
        byOwner,
        byProductGroup: [...byProductGroup.values()].map((group) => ({ ...group, resolved: group.won + group.lost, winRate: rate(group.won, group.lost) })).sort((a, b) => b.resolved - a.resolved),
        byRoute: [
          ...routes.map((route) => {
            const won = routeGroups.find((group) => group.routeToMarket === route && group.outcome === "WON")?._count._all ?? 0;
            const lost = routeGroups.find((group) => group.routeToMarket === route && group.outcome === "LOST")?._count._all ?? 0;
            return { key: route, won, lost, resolved: won + lost, winRate: rate(won, lost) };
          }),
          (() => {
            const won = routeGroups.find((group) => group.routeToMarket === null && group.outcome === "WON")?._count._all ?? 0;
            const lost = routeGroups.find((group) => group.routeToMarket === null && group.outcome === "LOST")?._count._all ?? 0;
            return { key: "UNSPECIFIED", won, lost, resolved: won + lost, winRate: rate(won, lost) };
          })(),
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
