import { Prisma, type PredictionAssessment, type PredictionModelVariant } from "@prisma/client";
import { prisma } from "../client.js";
import { convertMoneyToUsd, ILLUSTRATIVE_USD_KES_RATE } from "../domain/currency.js";
import type { DecisionSupportQuery } from "../schemas/analytics.schemas.js";
import type { ClientActor } from "./clientService.js";
import { ClientSalesHistoryService } from "./clientSalesHistoryService.js";
import { buildCurrentScoringInput, predictionMatchesCurrentInput } from "./opportunityScoringInputs.js";

type PredictionStatus = "CURRENT" | "STALE" | "UNSCORED";

function access(actor: ClientActor, requestedOwnerId?: number): Prisma.OpportunityWhereInput {
  return {
    client: { deletedAt: null },
    ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : requestedOwnerId ? { ownerId: requestedOwnerId } : {}),
  };
}

function followUpRank(status: "OVERDUE" | "UPCOMING" | "NONE") {
  return status === "OVERDUE" ? 0 : status === "UPCOMING" ? 1 : 2;
}

export class DecisionSupportService {
  private salesHistory = new ClientSalesHistoryService();

  async overview(actor: ClientActor, filters: DecisionSupportQuery) {
    const now = new Date();
    const openWhere: Prisma.OpportunityWhereInput = {
      ...access(actor, filters.ownerId),
      outcome: null,
      ...(filters.productGroupId ? { productSubgroup: { productGroupId: filters.productGroupId } } : {}),
      ...(filters.stage ? { stage: filters.stage } : {}),
      ...(filters.startDate || filters.endDate ? { createdAt: {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      } } : {}),
    };
    const openOpportunities = await prisma.opportunity.findMany({
      where: openWhere,
      include: {
        client: { select: { id: true, businessName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        productSubgroup: { include: { productGroup: true } },
        predictions: {
          orderBy: [{ predictedAt: "desc" }, { id: "desc" }],
          take: 1,
          include: { reviews: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 } },
        },
        followUps: { where: { completedAt: null }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 1 },
      },
    });

    const clientIds = [...new Set(openOpportunities.map((opportunity) => opportunity.clientId))];
    const evidenceByClient = await this.salesHistory.evidenceForClients(actor, clientIds, now);

    const rows = openOpportunities.map((opportunity) => {
      const prediction = opportunity.predictions[0];
      const evidence = evidenceByClient.get(opportunity.clientId);
      const eligible = Boolean(opportunity.routeToMarket && opportunity.productSubgroup && evidence && !evidence.reviewReason && (evidence.state === "UNKNOWN" || evidence.ibmRevenueCode !== null));
      const current = eligible && opportunity.routeToMarket && opportunity.productSubgroup && evidence
        ? buildCurrentScoringInput(
            opportunity as typeof opportunity & { routeToMarket: NonNullable<typeof opportunity.routeToMarket>; productSubgroup: NonNullable<typeof opportunity.productSubgroup> },
            evidence,
            now,
          )
        : null;
      const conversion = current?.conversion ?? convertMoneyToUsd({
        amount: opportunity.estimatedAmount,
        currency: opportunity.currency,
        ...(opportunity.currency === "KES" ? { rate: ILLUSTRATIVE_USD_KES_RATE } : {}),
        convertedAt: now,
      });
      const status: PredictionStatus = !prediction ? "UNSCORED" : current && predictionMatchesCurrentInput(prediction, current) ? "CURRENT" : "STALE";
      const probability = prediction ? Number(prediction.wonProbability) : null;
      const valueUsd = new Prisma.Decimal(conversion.modelReadyAmountUsd);
      const weightedValueUsd = status === "CURRENT" && probability !== null ? valueUsd.times(probability) : null;
      const nextFollowUp = opportunity.followUps[0];
      const followUpStatus = !nextFollowUp ? "NONE" as const : nextFollowUp.dueAt < now ? "OVERDUE" as const : "UPCOMING" as const;
      return {
        id: opportunity.id,
        title: opportunity.title,
        client: opportunity.client,
        owner: opportunity.owner,
        productGroup: opportunity.productSubgroup?.productGroup ?? null,
        estimatedAmount: opportunity.estimatedAmount.toString(),
        currency: opportunity.currency,
        estimatedValueUsd: valueUsd.toFixed(2),
        wonProbability: probability,
        weightedValueUsd: weightedValueUsd?.toFixed(2) ?? null,
        predictionStatus: status,
        modelVariant: prediction?.modelVariant ?? null,
        predictedAt: prediction?.predictedAt ?? null,
        eligible,
        nextFollowUp: nextFollowUp ? { id: nextFollowUp.id, title: nextFollowUp.title, dueAt: nextFollowUp.dueAt, status: followUpStatus } : null,
        followUpStatus,
        latestReview: prediction?.reviews[0]?.assessment ?? null,
      };
    });

    const filteredRows = filters.predictionStatus ? rows.filter((row) => row.predictionStatus === filters.predictionStatus) : rows;
    filteredRows.sort((a, b) => {
      if (filters.sort === "FOLLOW_UP") return followUpRank(a.followUpStatus) - followUpRank(b.followUpStatus) || a.title.localeCompare(b.title);
      if (filters.sort === "VALUE") return Number(b.estimatedValueUsd) - Number(a.estimatedValueUsd) || a.title.localeCompare(b.title);
      if (filters.sort === "PROBABILITY") return (b.wonProbability ?? -1) - (a.wonProbability ?? -1) || a.title.localeCompare(b.title);
      return Number(b.weightedValueUsd ?? -1) - Number(a.weightedValueUsd ?? -1) || a.title.localeCompare(b.title);
    });

    const eligible = rows.filter((row) => row.eligible);
    const current = rows.filter((row) => row.predictionStatus === "CURRENT");
    const stale = rows.filter((row) => row.predictionStatus === "STALE");
    const unscored = rows.filter((row) => row.predictionStatus === "UNSCORED");
    const weightedPipelineUsd = current.reduce((sum, row) => sum.plus(row.weightedValueUsd ?? 0), new Prisma.Decimal(0));
    const assessmentCounts: Record<PredictionAssessment, number> = { REASONABLE: 0, OVERESTIMATED: 0, UNDERESTIMATED: 0 };
    let unreviewed = 0;
    for (const row of rows.filter((item) => item.modelVariant !== null)) {
      if (row.latestReview) assessmentCounts[row.latestReview] += 1;
      else unreviewed += 1;
    }

    const resolved = await prisma.opportunity.findMany({
      where: {
        ...access(actor, filters.ownerId),
        outcome: { in: ["WON", "LOST"] },
        outcomeAt: {
          not: null,
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        },
        ...(filters.productGroupId ? { productSubgroup: { productGroupId: filters.productGroupId } } : {}),
      },
      select: {
        id: true,
        title: true,
        outcome: true,
        outcomeAt: true,
        client: { select: { id: true, businessName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        productSubgroup: { select: { productGroup: { select: { id: true, name: true } } } },
      },
    });
    const resolvedIds = resolved.map((opportunity) => opportunity.id);
    const resolvedById = new Map(resolved.map((opportunity) => [opportunity.id, opportunity]));
    const historicalPredictions = await prisma.opportunityPrediction.findMany({
      where: { opportunityId: { in: resolvedIds } },
      select: { id: true, opportunityId: true, modelVariant: true, wonProbability: true, predictedAt: true },
      orderBy: [{ predictedAt: "desc" }, { id: "desc" }],
    });
    const selectedPredictionByOpportunity = new Map<number, (typeof historicalPredictions)[number]>();
    for (const prediction of historicalPredictions) {
      const outcomeAt = resolvedById.get(prediction.opportunityId)?.outcomeAt;
      if (outcomeAt && prediction.predictedAt <= outcomeAt && !selectedPredictionByOpportunity.has(prediction.opportunityId)) {
        selectedPredictionByOpportunity.set(prediction.opportunityId, prediction);
      }
    }
    const eligibleOutcomes = [...selectedPredictionByOpportunity.values()];
    const outcomeByVariant = (["PRIMARY", "LIMITED_HISTORY"] satisfies PredictionModelVariant[]).map((variant) => {
      const selected = eligibleOutcomes.filter((prediction) => prediction.modelVariant === variant);
      return {
        variant,
        eligible: selected.length,
        won: selected.filter((prediction) => resolvedById.get(prediction.opportunityId)?.outcome === "WON").length,
        lost: selected.filter((prediction) => resolvedById.get(prediction.opportunityId)?.outcome === "LOST").length,
      };
    });
    const outcomeRows = eligibleOutcomes.map((prediction) => {
      const opportunity = resolvedById.get(prediction.opportunityId)!;
      return {
        id: opportunity.id,
        title: opportunity.title,
        outcome: opportunity.outcome!,
        outcomeAt: opportunity.outcomeAt!,
        client: opportunity.client,
        owner: opportunity.owner,
        productGroup: opportunity.productSubgroup?.productGroup ?? null,
        wonProbability: Number(prediction.wonProbability),
        modelVariant: prediction.modelVariant,
        predictedAt: prediction.predictedAt,
      };
    }).sort((left, right) => right.outcomeAt.getTime() - left.outcomeAt.getTime());

    const bins = [
      { key: "0-20%", minimum: 0, maximum: 0.2 }, { key: "20-40%", minimum: 0.2, maximum: 0.4 },
      { key: "40-60%", minimum: 0.4, maximum: 0.6 }, { key: "60-80%", minimum: 0.6, maximum: 0.8 },
      { key: "80-100%", minimum: 0.8, maximum: 1.000001 },
    ].map((bin) => ({ key: bin.key, count: current.filter((row) => row.wonProbability !== null && row.wonProbability >= bin.minimum && row.wonProbability < bin.maximum).length }));
    const start = (filters.page - 1) * filters.limit;

    return {
      scope: {
        ownerId: actor.role === "SALES_REP" ? actor.id : filters.ownerId ?? null,
        isAdmin: actor.role === "ADMIN",
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null,
        dateSemantics: "Open opportunities use createdAt; closed monitoring uses outcomeAt",
      },
      summary: {
        openOpportunities: rows.length,
        eligibleOpenOpportunities: eligible.length,
        currentPredictions: current.length,
        scoringCoveragePercent: eligible.length ? Number(((current.filter((row) => row.eligible).length / eligible.length) * 100).toFixed(1)) : null,
        needsAttention: stale.length + unscored.length,
        stalePredictions: stale.length,
        unscoredOpportunities: unscored.length,
        probabilityWeightedPipelineUsd: weightedPipelineUsd.toFixed(2),
      },
      charts: {
        probabilityDistribution: bins,
        coverage: { current: current.length, stale: stale.length, unscored: unscored.length },
        modelUsage: {
          primary: current.filter((row) => row.modelVariant === "PRIMARY").length,
          limitedHistory: current.filter((row) => row.modelVariant === "LIMITED_HISTORY").length,
        },
      },
      reviews: { ...assessmentCounts, unreviewed, basis: "Latest prediction per open opportunity; latest review only" },
      outcomeMonitoring: {
        resolvedOpportunities: resolved.length,
        eligiblePredictions: eligibleOutcomes.length,
        byModelVariant: outcomeByVariant,
        opportunities: outcomeRows,
        ready: eligibleOutcomes.length > 0,
        message: eligibleOutcomes.length
          ? `${eligibleOutcomes.length} scored ${eligibleOutcomes.length === 1 ? "opportunity has" : "opportunities have"} a recorded outcome. More outcomes are needed before drawing reliable model-performance conclusions.`
          : "No resolved opportunity has an eligible pre-outcome prediction yet.",
      },
      opportunities: filteredRows.slice(start, start + filters.limit),
      pagination: { page: filters.page, limit: filters.limit, total: filteredRows.length, totalPages: Math.ceil(filteredRows.length / filters.limit) },
      currencyBasis: {
        reportingCurrency: "USD",
        kesPerUsd: new Prisma.Decimal(ILLUSTRATIVE_USD_KES_RATE.quoteUnitsPerUsd).toString(),
        source: ILLUSTRATIVE_USD_KES_RATE.source,
        observedAt: ILLUSTRATIVE_USD_KES_RATE.observedAt.toISOString(),
      },
    };
  }
}
