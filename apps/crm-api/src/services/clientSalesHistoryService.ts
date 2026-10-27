import { endOfDay, subYears } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import { deriveIbmRevenueHistoryCode, ILLUSTRATIVE_USD_KES_RATE } from "../domain/currency.js";
import type { ClientActor } from "./clientService.js";
import type { VerifyRevenueCoverageInput } from "../schemas/clientSalesHistory.schemas.js";

const opportunityInclude = {
  owner: { select: { id: true, firstName: true, lastName: true } },
  productSubgroup: { include: { productGroup: true } },
} as const;

function clientAccess(actor: ClientActor): Prisma.ClientWhereInput {
  return { deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) };
}

function eligibleConfirmedSale(asOf: Date): Prisma.OpportunityWhereInput {
  return {
    outcome: "WON",
    outcomeAt: { lt: asOf },
    confirmedAmount: { not: null },
    confirmedCurrency: { not: null },
    confirmedAmountUsd: { not: null },
    confirmedQuoteUnitsPerUsd: { not: null },
    confirmedRateSource: { not: null },
    confirmedRateObservedAt: { not: null },
    confirmedAt: { lte: asOf },
  };
}

function missingConfirmedSale(asOf: Date): Prisma.OpportunityWhereInput {
  return {
    outcome: "WON",
    outcomeAt: { lt: asOf },
    OR: [
      { confirmedAmount: null },
      { confirmedCurrency: null },
      { confirmedAmountUsd: null },
      { confirmedQuoteUnitsPerUsd: null },
      { confirmedRateSource: null },
      { confirmedRateObservedAt: null },
      { confirmedAt: null },
      { confirmedAt: { gt: asOf } },
    ],
  };
}

function sumUsd(rows: Array<{ confirmedAmountUsd: Prisma.Decimal | null }>) {
  return rows.reduce((total, row) => total.plus(row.confirmedAmountUsd ?? 0), new Prisma.Decimal(0));
}

export function deriveRevenueEvidenceState(input: {
  coverage: {
    complete: boolean;
    declaration: "YES" | "NO" | "NOT_SURE";
    coverageStart: Date;
    coverageEnd: Date;
    amount: Prisma.Decimal;
  } | null;
  windowStart: Date;
  asOf: Date;
  windowRevenueUsd: Prisma.Decimal;
  windowMissingCount: number;
}) {
  const evidenceComplete = Boolean(
    input.coverage?.complete
    && input.coverage.declaration !== "NOT_SURE"
    && input.coverage.coverageStart <= input.windowStart
    && input.coverage.coverageEnd >= input.asOf
    && input.windowMissingCount === 0
    && input.coverage.amount.equals(input.windowRevenueUsd)
    && (input.coverage.declaration === "NO" ? input.windowRevenueUsd.isZero() : !input.windowRevenueUsd.isZero()),
  );
  let ibmRevenueCode: 0 | 1 | 2 | 3 | 4 | null = null;
  let reviewReason: string | null = null;
  if (evidenceComplete) {
    try { ibmRevenueCode = deriveIbmRevenueHistoryCode(input.windowRevenueUsd); }
    catch (error) { reviewReason = error instanceof Error ? error.message : "Revenue evidence requires review"; }
  }
  return {
    state: !evidenceComplete ? "UNKNOWN" as const : input.windowRevenueUsd.isZero() ? "VERIFIED_ZERO" as const : "VERIFIED_COMPLETE" as const,
    amountUsd: evidenceComplete ? input.windowRevenueUsd.toString() : null,
    ibmRevenueCode,
    reviewReason,
  };
}

export class ClientSalesHistoryService {
  private async findClient(actor: ClientActor, clientId: number) {
    return prisma.client.findFirst({
      where: { ...clientAccess(actor), id: clientId },
      select: { id: true, businessName: true },
    });
  }

  async get(actor: ClientActor, clientId: number, requestedAsOf?: string) {
    const client = await this.findClient(actor, clientId);
    if (!client) return null;

    const asOf = requestedAsOf ? new Date(requestedAsOf) : new Date();
    if (!Number.isFinite(asOf.getTime()) || asOf > new Date()) throw new Error("INVALID_AS_OF");
    const windowStart = subYears(asOf, 2);
    const windowWhere: Prisma.OpportunityWhereInput = { clientId, outcomeAt: { gte: windowStart, lt: asOf } };

    const [opportunities, confirmedSales, missingConfirmedCount, windowConfirmedSales, windowMissingCount, coverage] = await Promise.all([
      prisma.opportunity.findMany({ where: { clientId }, include: opportunityInclude, orderBy: [{ outcomeAt: "desc" }, { createdAt: "desc" }] }),
      prisma.opportunity.findMany({
        where: { clientId, ...eligibleConfirmedSale(asOf) },
        select: { confirmedAmount: true, confirmedCurrency: true, confirmedAmountUsd: true },
      }),
      prisma.opportunity.count({ where: { clientId, ...missingConfirmedSale(asOf) } }),
      prisma.opportunity.findMany({
        where: { AND: [windowWhere, eligibleConfirmedSale(asOf)] },
        select: { confirmedAmountUsd: true },
      }),
      prisma.opportunity.count({ where: { AND: [windowWhere, missingConfirmedSale(asOf)] } }),
      prisma.clientRevenueSummary.findFirst({
        where: { clientId, verifiedAt: { lte: asOf } },
        include: { verifiedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: [{ verifiedAt: "desc" }, { id: "desc" }],
      }),
    ]);

    const totalsByCurrency = new Map<string, Prisma.Decimal>();
    for (const sale of confirmedSales) {
      if (sale.confirmedAmount && sale.confirmedCurrency) {
        totalsByCurrency.set(sale.confirmedCurrency, (totalsByCurrency.get(sale.confirmedCurrency) ?? new Prisma.Decimal(0)).plus(sale.confirmedAmount));
      }
    }
    const totalConfirmedUsd = sumUsd(confirmedSales);
    const windowRevenueUsd = sumUsd(windowConfirmedSales);
    const evidence = deriveRevenueEvidenceState({ coverage, windowStart, asOf, windowRevenueUsd, windowMissingCount });

    return {
      client,
      asOf: asOf.toISOString(),
      opportunities,
      confirmedSales: {
        totalUsd: totalConfirmedUsd.toString(),
        eligibleCount: confirmedSales.length,
        missingConfirmedCount,
        totalsByCurrency: Array.from(totalsByCurrency, ([currency, amount]) => ({ currency, amount: amount.toString() })),
        conversionBasis: {
          kesPerUsd: new Prisma.Decimal(ILLUSTRATIVE_USD_KES_RATE.quoteUnitsPerUsd).toString(),
          source: ILLUSTRATIVE_USD_KES_RATE.source,
          observedAt: ILLUSTRATIVE_USD_KES_RATE.observedAt.toISOString(),
        },
      },
      revenueEvidence: {
        state: evidence.state,
        windowStart: windowStart.toISOString(),
        windowEnd: asOf.toISOString(),
        amountUsd: evidence.amountUsd,
        ibmRevenueCode: evidence.ibmRevenueCode,
        reviewReason: evidence.reviewReason,
        missingConfirmedCount: windowMissingCount,
        coverage: coverage ? {
          id: coverage.id,
          coverageStart: coverage.coverageStart.toISOString(),
          coverageEnd: coverage.coverageEnd.toISOString(),
          evidenceSource: coverage.evidenceSource,
          declaration: coverage.declaration,
          complete: coverage.complete,
          verifiedAt: coverage.verifiedAt.toISOString(),
          verifiedBy: coverage.verifiedBy,
        } : null,
      },
    };
  }

  async verifyCoverage(actor: ClientActor, clientId: number, input: VerifyRevenueCoverageInput) {
    const client = await this.findClient(actor, clientId);
    if (!client) return null;
    const verifiedAt = new Date();
    const coverageStart = subYears(verifiedAt, 2);
    const coverageEnd = endOfDay(verifiedAt);
    const evidenceSource = input.declaration === "NOT_SURE"
      ? "User declared that purchase history is unavailable or cannot be verified"
      : input.declaration === "NO"
        ? "User confirmed no qualifying purchases in the automatic two-year period"
        : "User confirmed recorded purchases are complete for the automatic two-year period";

    const range = { clientId, outcomeAt: { gte: coverageStart, lt: coverageEnd } } satisfies Prisma.OpportunityWhereInput;
    const [missingCount, confirmedSales] = await Promise.all([
      prisma.opportunity.count({ where: { AND: [range, missingConfirmedSale(verifiedAt)] } }),
      prisma.opportunity.findMany({
        where: { AND: [range, eligibleConfirmedSale(verifiedAt)] },
        select: { confirmedAmountUsd: true },
      }),
    ]);
    if (missingCount && input.declaration !== "NOT_SURE") throw new Error("INCOMPLETE_WON_SALES");
    const amount = sumUsd(confirmedSales);
    if (input.declaration === "NO" && !amount.isZero()) throw new Error("PURCHASES_EXIST");
    if (input.declaration === "YES" && amount.isZero()) throw new Error("PURCHASES_NOT_RECORDED");
    return prisma.clientRevenueSummary.create({ data: {
      clientId,
      amount,
      currency: "USD",
      coverageStart,
      coverageEnd,
      evidenceSource,
      declaration: input.declaration,
      complete: input.declaration !== "NOT_SURE",
      verifiedAt,
      verifiedById: actor.id,
    } });
  }
}
