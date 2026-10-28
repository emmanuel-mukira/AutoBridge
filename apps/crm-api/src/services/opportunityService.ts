import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import type { ClientActor } from "./clientService.js";
import {
  convertMoneyToUsd,
  ILLUSTRATIVE_USD_KES_RATE,
} from "../domain/currency.js";
import type {
  ConfirmedSaleInput,
  CreateOpportunityInput,
  ListOpportunitiesInput,
  TransitionOpportunityInput,
  UpdateOpportunityInput,
} from "../schemas/opportunity.schemas.js";
import {
  catalogueLines,
  quotationItemData,
  quotationTotals,
  validatePrincipalCategory,
} from "./quotationPricing.js";
import { ClientSalesHistoryService } from "./clientSalesHistoryService.js";
import {
  buildCurrentScoringInput,
  type CurrentScoringInput,
  predictionMatchesCurrentInput,
} from "./opportunityScoringInputs.js";

const stages = [
  "NEW",
  "QUALIFYING",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED",
] as const;

const include = {
  client: { select: { id: true, businessName: true } },
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  productSubgroup: { include: { productGroup: true } },
} as const;

const listInclude = {
  ...include,
  predictions: {
    orderBy: [{ predictedAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      wonProbability: true,
      modelVersion: true,
      adapterVersion: true,
      modelVariant: true,
      predictedAt: true,
      inputSnapshot: true,
    },
  },
} satisfies Prisma.OpportunityInclude;

function latestPredictionSummary(
  opportunity: Prisma.OpportunityGetPayload<{ include: typeof listInclude }>,
  current: CurrentScoringInput | null,
) {
  const prediction = opportunity.predictions[0];
  if (!prediction) return null;
  return {
    wonProbability: prediction.wonProbability.toString(),
    modelVariant: prediction.modelVariant,
    predictedAt: prediction.predictedAt,
    stale: opportunity.outcome ? false : !current || !predictionMatchesCurrentInput(prediction, current),
  };
}

function access(actor: ClientActor): Prisma.OpportunityWhereInput {
  return {
    client: { deletedAt: null },
    ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}),
  };
}

function confirmedSaleData(input: ConfirmedSaleInput, confirmedAt: Date) {
  const conversion = convertMoneyToUsd({
    amount: input.confirmedAmount,
    currency: input.confirmedCurrency,
    ...(input.confirmedCurrency === "KES"
      ? { rate: ILLUSTRATIVE_USD_KES_RATE }
      : {}),
    convertedAt: confirmedAt,
  });
  return {
    confirmedAmount: conversion.originalAmount,
    confirmedCurrency: conversion.originalCurrency,
    confirmedAmountUsd: conversion.modelReadyAmountUsd,
    confirmedQuoteUnitsPerUsd: conversion.quoteUnitsPerUsd,
    confirmedRateSource: conversion.rateSource,
    confirmedRateObservedAt: new Date(conversion.rateObservedAt),
    confirmedAt,
  };
}

export class OpportunityService {
  private salesHistory = new ClientSalesHistoryService();
  private async validateReferences(
    actor: ClientActor,
    clientId: number,
    ownerId: number,
    productSubgroupId?: number | null,
  ) {
    const [client, owner, productSubgroup] = await Promise.all([
      prisma.client.findFirst({
        where: {
          id: clientId,
          deletedAt: null,
          ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}),
        },
        select: { id: true, ownerId: true },
      }),
      prisma.user.findFirst({
        where: { id: ownerId, active: true },
        select: { id: true },
      }),
      productSubgroupId
        ? prisma.productSubgroup.findUnique({
            where: { id: productSubgroupId },
            select: { id: true },
          })
        : Promise.resolve({ id: 0 }),
    ]);
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    if (!owner) throw new Error("OWNER_NOT_FOUND");
    if (client.ownerId !== ownerId) throw new Error("CLIENT_OWNER_MISMATCH");
    if (!productSubgroup) throw new Error("PRODUCT_SUBGROUP_NOT_FOUND");
  }

  async create(actor: ClientActor, input: CreateOpportunityInput) {
    const ownerId =
      actor.role === "ADMIN" ? (input.ownerId ?? actor.id) : actor.id;
    await this.validateReferences(
      actor,
      input.clientId,
      ownerId,
      input.productSubgroupId,
    );
    const client = await prisma.client.findUniqueOrThrow({
      where: { id: input.clientId },
    });
    const contact = input.contactId
      ? await prisma.contact.findFirst({
          where: { id: input.contactId, clientId: input.clientId },
        })
      : null;
    if (input.contactId && !contact) throw new Error("CONTACT_MISMATCH");
    return prisma.$transaction(
      async (tx) => {
        const lines = await catalogueLines(tx, input.items);
        validatePrincipalCategory(lines, input.productSubgroupId);
        const totals = quotationTotals(lines, 0);
        const opportunity = await tx.opportunity.create({
          data: {
            clientId: input.clientId,
            ownerId,
            productSubgroupId: input.productSubgroupId,
            title: input.title.trim(),
            estimatedAmount: totals.totalAmount,
            currency: "KES",
            routeToMarket: input.routeToMarket ?? null,
            estimatedCloseAt: input.estimatedCloseAt
              ? new Date(input.estimatedCloseAt)
              : null,
          },
        });
        const validUntil = new Date();
        validUntil.setUTCDate(validUntil.getUTCDate() + 14);
        await tx.quotation.create({
          data: {
            quoteNumber: `ABQ-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
            opportunityId: opportunity.id,
            clientId: input.clientId,
            contactId: contact?.id ?? null,
            createdById: actor.id,
            version: 1,
            current: true,
            currency: "KES",
            issueDate: null,
            validUntil,
            ...totals,
            clientNameSnapshot: client.businessName,
            clientAddressSnapshot: `${client.locationAddress}, ${client.countyName}`,
            contactNameSnapshot: contact
              ? `${contact.firstName} ${contact.lastName}`
              : null,
            terms:
              "Prices are valid until the date shown and subject to product availability.",
            items: { create: lines.map(quotationItemData) },
          },
        });
        return tx.opportunity.findUniqueOrThrow({
          where: { id: opportunity.id },
          include,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async list(actor: ClientActor, filters: ListOpportunitiesInput) {
    const where: Prisma.OpportunityWhereInput = {
      ...access(actor),
      ...(filters.search
        ? { title: { contains: filters.search, mode: "insensitive" } }
        : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.ownerId && actor.role === "ADMIN"
        ? { ownerId: filters.ownerId }
        : {}),
      ...(filters.productSubgroupId
        ? { productSubgroupId: filters.productSubgroupId }
        : {}),
      ...(filters.productGroupId
        ? { productSubgroup: { productGroupId: filters.productGroupId } }
        : {}),
      ...(filters.stage ? { stage: filters.stage } : {}),
      ...(filters.routeToMarket
        ? { routeToMarket: filters.routeToMarket }
        : {}),
    };
    const [opportunities, total] = await prisma.$transaction([
      prisma.opportunity.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.opportunity.count({ where }),
    ]);
    const asOf = new Date();
    const evidenceByClient = await this.salesHistory.evidenceForClients(
      actor,
      opportunities.map((opportunity) => opportunity.clientId),
      asOf,
    );
    return {
      opportunities: opportunities.map((opportunity) => {
        const evidence = evidenceByClient.get(opportunity.clientId);
        const current = !opportunity.outcome && opportunity.routeToMarket && opportunity.productSubgroup && evidence
          && !evidence.reviewReason && (evidence.state === "UNKNOWN" || evidence.ibmRevenueCode !== null)
          ? buildCurrentScoringInput(
              opportunity as typeof opportunity & { routeToMarket: NonNullable<typeof opportunity.routeToMarket>; productSubgroup: NonNullable<typeof opportunity.productSubgroup> },
              evidence,
              asOf,
            )
          : null;
        const { predictions, ...row } = opportunity;
        return { ...row, latestPrediction: latestPredictionSummary(opportunity, current) };
      }),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getById(actor: ClientActor, id: number) {
    return prisma.opportunity.findFirst({
      where: { ...access(actor), id },
      include,
    });
  }

  async update(actor: ClientActor, id: number, input: UpdateOpportunityInput) {
    const current = await this.getById(actor, id);
    if (!current) return null;
    const clientId = input.clientId ?? current.clientId;
    if (
      clientId !== current.clientId &&
      (await prisma.quotation.count({ where: { opportunityId: id } }))
    ) {
      throw new Error("OPPORTUNITY_HAS_QUOTATIONS");
    }
    const ownerId =
      actor.role === "ADMIN" ? (input.ownerId ?? current.ownerId) : actor.id;
    const productSubgroupId =
      input.productSubgroupId ?? current.productSubgroupId;
    await this.validateReferences(actor, clientId, ownerId, productSubgroupId);
    if (input.productSubgroupId !== undefined) {
      const currentQuotation = await prisma.quotation.findFirst({
        where: { opportunityId: id, current: true },
        include: {
          items: {
            include: {
              product: {
                include: {
                  productSubgroup: { include: { productGroup: true } },
                },
              },
            },
          },
        },
      });
      if (!currentQuotation) throw new Error("CURRENT_QUOTATION_NOT_FOUND");
      validatePrincipalCategory(
        currentQuotation.items.map((item) => ({
          productSubgroupId: item.product.productSubgroupId,
          productGroupName: item.product.productSubgroup.productGroup.name,
          productSubgroupName: item.product.productSubgroup.name,
        })),
        input.productSubgroupId,
      );
    }
    return prisma.opportunity.update({
      where: { id },
      data: {
        ...(input.clientId !== undefined ? { clientId } : {}),
        ...(input.ownerId !== undefined && actor.role === "ADMIN"
          ? { ownerId }
          : {}),
        ...(input.productSubgroupId !== undefined ? { productSubgroupId } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.routeToMarket !== undefined
          ? { routeToMarket: input.routeToMarket }
          : {}),
        ...(input.estimatedCloseAt !== undefined
          ? {
              estimatedCloseAt: input.estimatedCloseAt
                ? new Date(input.estimatedCloseAt)
                : null,
            }
          : {}),
      },
      include,
    });
  }

  async transition(
    actor: ClientActor,
    id: number,
    input: TransitionOpportunityInput,
  ) {
    const current = await this.getById(actor, id);
    if (!current) return null;
    if (stages.indexOf(input.stage) <= stages.indexOf(current.stage))
      throw new Error("INVALID_STAGE_TRANSITION");

    const transitionAt = new Date();
    const updated = await prisma.opportunity.updateMany({
      where: { ...access(actor), id, stage: current.stage },
      data: {
        stage: input.stage,
        outcome: input.stage === "CLOSED" ? input.outcome : null,
        outcomeAt: input.stage === "CLOSED" ? transitionAt : null,
        ...(input.stage === "CLOSED" && input.outcome === "WON"
          ? confirmedSaleData(
              {
                confirmedAmount: input.confirmedAmount!,
                confirmedCurrency: input.confirmedCurrency!,
              },
              transitionAt,
            )
          : {}),
      },
    });
    if (!updated.count) throw new Error("STAGE_TRANSITION_CONFLICT");
    return this.getById(actor, id);
  }

  async correctConfirmedSale(
    actor: ClientActor,
    id: number,
    input: ConfirmedSaleInput,
  ) {
    const confirmedAt = new Date();
    const updated = await prisma.opportunity.updateMany({
      where: { ...access(actor), id, stage: "CLOSED", outcome: "WON" },
      data: confirmedSaleData(input, confirmedAt),
    });
    if (!updated.count) return null;
    return this.getById(actor, id);
  }

  async listProducts() {
    return prisma.productGroup.findMany({
      include: { subgroups: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  async listOwners(actor: ClientActor) {
    return prisma.user.findMany({
      where: {
        active: true,
        ...(actor.role === "SALES_REP" ? { id: actor.id } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }
}
