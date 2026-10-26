import { subYears } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import { deriveIbmRevenueHistoryCode, ILLUSTRATIVE_USD_KES_RATE } from "../domain/currency.js";
import type { ClientActor } from "./clientService.js";

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
        where: {
          clientId,
          coverageStart: { lte: windowStart },
          coverageEnd: { gte: windowStart, lte: asOf },
          verifiedAt: { lte: asOf },
        },
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
    const evidenceComplete = Boolean(coverage) && windowMissingCount === 0;
    let ibmRevenueCode: 0 | 1 | 2 | 3 | 4 | null = null;
    let reviewReason: string | null = null;
    if (evidenceComplete) {
      try { ibmRevenueCode = deriveIbmRevenueHistoryCode(windowRevenueUsd); }
      catch (error) { reviewReason = error instanceof Error ? error.message : "Revenue evidence requires review"; }
    }

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
        state: !evidenceComplete ? "UNKNOWN" : windowRevenueUsd.isZero() ? "VERIFIED_ZERO" : "VERIFIED_COMPLETE",
        windowStart: windowStart.toISOString(),
        windowEnd: asOf.toISOString(),
        amountUsd: evidenceComplete ? windowRevenueUsd.toString() : null,
        ibmRevenueCode,
        reviewReason,
        missingConfirmedCount: windowMissingCount,
        coverage: coverage ? {
          id: coverage.id,
          coverageStart: coverage.coverageStart.toISOString(),
          coverageEnd: coverage.coverageEnd.toISOString(),
          evidenceSource: coverage.evidenceSource,
          verifiedAt: coverage.verifiedAt.toISOString(),
          verifiedBy: coverage.verifiedBy,
        } : null,
      },
    };
  }

  async verifyCoverage(actor: ClientActor, clientId: number) {
    const client = await this.findClient(actor, clientId);
    if (!client) return null;
    const verifiedAt = new Date();
    const coverageStart = subYears(verifiedAt, 2);
    const coverageEnd = verifiedAt;
    const evidenceSource = "User confirmed complete sales history in AutoBridge";

    const range = { clientId, outcomeAt: { gte: coverageStart, lt: coverageEnd } } satisfies Prisma.OpportunityWhereInput;
    const [missingCount, confirmedSales] = await Promise.all([
      prisma.opportunity.count({ where: { AND: [range, missingConfirmedSale(verifiedAt)] } }),
      prisma.opportunity.findMany({
        where: { AND: [range, eligibleConfirmedSale(verifiedAt)] },
        select: { confirmedAmountUsd: true },
      }),
    ]);
    if (missingCount) throw new Error("INCOMPLETE_WON_SALES");
    const amount = sumUsd(confirmedSales);
    return prisma.clientRevenueSummary.create({ data: {
      clientId,
      amount,
      currency: "USD",
      coverageStart,
      coverageEnd,
      evidenceSource,
      verifiedAt,
      verifiedById: actor.id,
    } });
  }
}
