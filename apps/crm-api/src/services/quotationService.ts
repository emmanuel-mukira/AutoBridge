import { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import type {
  ListQuotationSeriesInput,
  ListQuotationsInput,
  QuotationDraftInput,
  QuotationStatusInput,
} from "../schemas/quotation.schemas.js";
import type { ClientActor } from "./clientService.js";
import {
  catalogueLines,
  quotationItemData,
  quotationTotals,
  validatePrincipalCategory,
} from "./quotationPricing.js";

const detailInclude = {
  opportunity: {
    select: {
      id: true,
      title: true,
      ownerId: true,
      clientId: true,
      productSubgroupId: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  client: { select: { id: true, businessName: true } },
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  supersedes: {
    select: { id: true, quoteNumber: true, version: true, status: true },
  },
  supersededBy: {
    select: { id: true, quoteNumber: true, version: true, status: true },
  },
  items: {
    include: { product: { select: { id: true, active: true } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.QuotationInclude;

const seriesInclude = {
  opportunity: {
    select: {
      id: true,
      title: true,
      ownerId: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  client: { select: { id: true, businessName: true } },
} satisfies Prisma.QuotationInclude;

function access(actor: ClientActor): Prisma.QuotationWhereInput {
  return actor.role === "ADMIN"
    ? {}
    : {
        opportunity: {
          ownerId: actor.id,
          client: { ownerId: actor.id, deletedAt: null },
        },
      };
}

export class QuotationService {
  async listSeries(actor: ClientActor, filters: ListQuotationSeriesInput) {
    const where: Prisma.QuotationWhereInput = {
      ...access(actor),
      current: true,
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.ownerId && actor.role === "ADMIN"
        ? { opportunity: { ownerId: filters.ownerId } }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                quoteNumber: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                clientNameSnapshot: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                opportunity: {
                  title: { contains: filters.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: seriesInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.quotation.count({ where }),
    ]);
    const counts = quotations.length
      ? await prisma.quotation.groupBy({
          by: ["quoteNumber"],
          where: {
            ...access(actor),
            quoteNumber: { in: quotations.map((item) => item.quoteNumber) },
          },
          _count: { _all: true },
        })
      : [];
    const versionCounts = new Map(
      counts.map((item) => [item.quoteNumber, item._count._all]),
    );
    return {
      series: quotations.map((quotation) => ({
        ...quotation,
        versionCount: versionCounts.get(quotation.quoteNumber) ?? 1,
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async list(actor: ClientActor, filters: ListQuotationsInput) {
    return prisma.quotation.findMany({
      where: {
        ...access(actor),
        ...(filters.opportunityId
          ? { opportunityId: filters.opportunityId }
          : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.ownerId && actor.role === "ADMIN"
          ? { opportunity: { ownerId: filters.ownerId } }
          : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  quoteNumber: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
                {
                  clientNameSnapshot: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
                {
                  opportunity: {
                    title: { contains: filters.search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: detailInclude,
      orderBy: [{ createdAt: "desc" }, { version: "desc" }],
    });
  }

  async getById(actor: ClientActor, id: number) {
    return prisma.quotation.findFirst({
      where: { ...access(actor), id },
      include: detailInclude,
    });
  }

  async update(actor: ClientActor, id: number, input: QuotationDraftInput) {
    const current = await this.getById(actor, id);
    if (!current) return null;
    if (current.status !== "DRAFT") throw new Error("QUOTATION_IMMUTABLE");
    if (new Date(input.validUntil) < new Date())
      throw new Error("INVALID_VALID_UNTIL");
    const contact = input.contactId
      ? await prisma.contact.findFirst({
          where: { id: input.contactId, clientId: current.clientId },
        })
      : null;
    if (input.contactId && !contact) throw new Error("CONTACT_MISMATCH");

    return prisma.$transaction(
      async (tx) => {
        const existing = new Map(
          current.items.map((item) => [item.productId, item]),
        );
        const newInputs = input.items.filter(
          (item) => !existing.has(item.productId),
        );
        const newLines = new Map(
          (await catalogueLines(tx, newInputs)).map((line) => [
            line.productId,
            line,
          ]),
        );
        const lines = input.items.map((item) => {
          const saved = existing.get(item.productId);
          if (!saved) return newLines.get(item.productId)!;
          const quantity = new Prisma.Decimal(item.quantity);
          const unitPrice = saved.unitPrice.toDecimalPlaces(2);
          return {
            productId: saved.productId,
            productSubgroupId: 0,
            productGroupName: "",
            productSubgroupName: "",
            skuSnapshot: saved.skuSnapshot,
            productNameSnapshot: saved.productNameSnapshot,
            brandSnapshot: saved.brandSnapshot,
            descriptionSnapshot: saved.descriptionSnapshot,
            unitSnapshot: saved.unitSnapshot,
            quantity,
            unitPrice,
            lineTotal: quantity.mul(unitPrice).toDecimalPlaces(2),
          };
        });
        const products = await tx.product.findMany({
          where: { id: { in: lines.map((line) => line.productId) } },
          include: { productSubgroup: { include: { productGroup: true } } },
        });
        validatePrincipalCategory(
          products.map((product) => ({
            productSubgroupId: product.productSubgroupId,
            productGroupName: product.productSubgroup.productGroup.name,
            productSubgroupName: product.productSubgroup.name,
          })),
          current.opportunity.productSubgroupId!,
        );
        const totals = quotationTotals(lines, input.discountPercent);
        const locked = await tx.quotation.updateMany({
          where: { id, status: "DRAFT", updatedAt: current.updatedAt },
          data: {
            contactId: contact?.id ?? null,
            validUntil: new Date(input.validUntil),
            ...totals,
            contactNameSnapshot: contact
              ? `${contact.firstName} ${contact.lastName}`
              : null,
            notes: input.notes || null,
            terms: input.terms || null,
          },
        });
        if (!locked.count) throw new Error("QUOTATION_CONFLICT");
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        await tx.quotationItem.createMany({
          data: lines.map((line) => ({
            quotationId: id,
            ...quotationItemData(line),
          })),
        });
        if (current.current)
          await tx.opportunity.update({
            where: { id: current.opportunityId },
            data: { estimatedAmount: totals.totalAmount, currency: "KES" },
          });
        return tx.quotation.findUniqueOrThrow({
          where: { id },
          include: detailInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async revise(actor: ClientActor, id: number) {
    const source = await this.getById(actor, id);
    if (!source) return null;
    if (source.status !== "SENT" && source.status !== "REJECTED")
      throw new Error("QUOTATION_NOT_REVISABLE");
    try {
      return await prisma.$transaction(
        async (tx) => {
          if (
            await tx.quotation.count({
              where: { opportunityId: source.opportunityId, status: "DRAFT" },
            })
          )
            throw new Error("DRAFT_ALREADY_EXISTS");
          const latest = await tx.quotation.aggregate({
            where: { opportunityId: source.opportunityId },
            _max: { version: true },
          });
          return tx.quotation.create({
            data: {
              quoteNumber: source.quoteNumber,
              opportunityId: source.opportunityId,
              clientId: source.clientId,
              contactId: source.contactId,
              createdById: actor.id,
              version: (latest._max.version ?? 0) + 1,
              supersedesId: source.id,
              status: "DRAFT",
              current: false,
              currency: "KES",
              issueDate: null,
              validUntil: source.validUntil,
              subtotal: source.subtotal,
              discountPercent: source.discountPercent,
              discountAmount: source.discountAmount,
              totalAmount: source.totalAmount,
              clientNameSnapshot: source.clientNameSnapshot,
              clientAddressSnapshot: source.clientAddressSnapshot,
              contactNameSnapshot: source.contactNameSnapshot,
              notes: source.notes,
              terms: source.terms,
              items: {
                create: source.items.map((item) => ({
                  productId: item.productId,
                  skuSnapshot: item.skuSnapshot,
                  productNameSnapshot: item.productNameSnapshot,
                  brandSnapshot: item.brandSnapshot,
                  descriptionSnapshot: item.descriptionSnapshot,
                  unitSnapshot: item.unitSnapshot,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  lineTotal: item.lineTotal,
                })),
              },
            },
            include: detailInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new Error("QUOTATION_CONFLICT");
      throw error;
    }
  }

  async updateStatus(
    actor: ClientActor,
    id: number,
    input: QuotationStatusInput,
  ) {
    const current = await this.getById(actor, id);
    if (!current) return null;
    const valid =
      (current.status === "DRAFT" && input.status === "SENT") ||
      (current.status === "SENT" &&
        (input.status === "ACCEPTED" || input.status === "REJECTED"));
    if (!valid) throw new Error("INVALID_QUOTATION_TRANSITION");
    const now = new Date();
    return prisma.$transaction(
      async (tx) => {
        if (input.status === "SENT") {
          const effective = await tx.quotation.findFirst({
            where: { opportunityId: current.opportunityId, current: true },
          });
          if (effective && effective.id !== id) {
            await tx.quotation.update({
              where: { id: effective.id },
              data: { status: "SUPERSEDED", current: false, supersededAt: now },
            });
          }
          const updated = await tx.quotation.updateMany({
            where: { id, status: "DRAFT", updatedAt: current.updatedAt },
            data: {
              status: "SENT",
              current: true,
              issueDate: now,
              sentAt: now,
            },
          });
          if (!updated.count) throw new Error("QUOTATION_CONFLICT");
          await tx.opportunity.update({
            where: { id: current.opportunityId },
            data: { estimatedAmount: current.totalAmount, currency: "KES" },
          });
        } else {
          const updated = await tx.quotation.updateMany({
            where: { id, status: "SENT", updatedAt: current.updatedAt },
            data: { status: input.status, decidedAt: now },
          });
          if (!updated.count) throw new Error("QUOTATION_CONFLICT");
        }
        return tx.quotation.findUniqueOrThrow({
          where: { id },
          include: detailInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
