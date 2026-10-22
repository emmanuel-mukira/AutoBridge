import type { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import type { ClientActor } from "./clientService.js";
import type { CreateOpportunityInput, ListOpportunitiesInput, TransitionOpportunityInput, UpdateOpportunityInput } from "../schemas/opportunity.schemas.js";

const stages = ["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION", "CLOSED"] as const;

const include = {
  client: { select: { id: true, businessName: true } },
  owner: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  productSubgroup: { include: { productGroup: true } },
} as const;

function access(actor: ClientActor): Prisma.OpportunityWhereInput {
  return {
    client: { deletedAt: null },
    ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}),
  };
}

export class OpportunityService {
  private async validateReferences(actor: ClientActor, clientId: number, ownerId: number, productSubgroupId?: number | null) {
    const [client, owner, productSubgroup] = await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId, deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) },
        select: { id: true, ownerId: true },
      }),
      prisma.user.findFirst({ where: { id: ownerId, active: true }, select: { id: true } }),
      productSubgroupId
        ? prisma.productSubgroup.findUnique({ where: { id: productSubgroupId }, select: { id: true } })
        : Promise.resolve({ id: 0 }),
    ]);
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    if (!owner) throw new Error("OWNER_NOT_FOUND");
    if (client.ownerId !== ownerId) throw new Error("CLIENT_OWNER_MISMATCH");
    if (!productSubgroup) throw new Error("PRODUCT_SUBGROUP_NOT_FOUND");
  }

  async create(actor: ClientActor, input: CreateOpportunityInput) {
    const ownerId = actor.role === "ADMIN" ? input.ownerId ?? actor.id : actor.id;
    await this.validateReferences(actor, input.clientId, ownerId, input.productSubgroupId);
    return prisma.opportunity.create({
      data: {
        clientId: input.clientId,
        ownerId,
        productSubgroupId: input.productSubgroupId ?? null,
        title: input.title.trim(),
        estimatedAmount: input.estimatedAmount,
        currency: input.currency,
        routeToMarket: input.routeToMarket ?? null,
        estimatedCloseAt: input.estimatedCloseAt ? new Date(input.estimatedCloseAt) : null,
      },
      include,
    });
  }

  async list(actor: ClientActor, filters: ListOpportunitiesInput) {
    const where: Prisma.OpportunityWhereInput = {
      ...access(actor),
      ...(filters.search ? { title: { contains: filters.search, mode: "insensitive" } } : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.ownerId && actor.role === "ADMIN" ? { ownerId: filters.ownerId } : {}),
      ...(filters.productSubgroupId ? { productSubgroupId: filters.productSubgroupId } : {}),
      ...(filters.productGroupId ? { productSubgroup: { productGroupId: filters.productGroupId } } : {}),
      ...(filters.stage ? { stage: filters.stage } : {}),
      ...(filters.routeToMarket ? { routeToMarket: filters.routeToMarket } : {}),
    };
    const [opportunities, total] = await prisma.$transaction([
      prisma.opportunity.findMany({
        where,
        include,
        orderBy: { updatedAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.opportunity.count({ where }),
    ]);
    return { opportunities, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
  }

  async getById(actor: ClientActor, id: number) {
    return prisma.opportunity.findFirst({ where: { ...access(actor), id }, include });
  }

  async update(actor: ClientActor, id: number, input: UpdateOpportunityInput) {
    const current = await this.getById(actor, id);
    if (!current) return null;
    const clientId = input.clientId ?? current.clientId;
    const ownerId = actor.role === "ADMIN" ? input.ownerId ?? current.ownerId : actor.id;
    const productSubgroupId = input.productSubgroupId === undefined ? current.productSubgroupId : input.productSubgroupId;
    await this.validateReferences(actor, clientId, ownerId, productSubgroupId);
    return prisma.opportunity.update({
      where: { id },
      data: {
        ...(input.clientId !== undefined ? { clientId } : {}),
        ...(input.ownerId !== undefined && actor.role === "ADMIN" ? { ownerId } : {}),
        ...(input.productSubgroupId !== undefined ? { productSubgroupId } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.estimatedAmount !== undefined ? { estimatedAmount: input.estimatedAmount } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.routeToMarket !== undefined ? { routeToMarket: input.routeToMarket } : {}),
        ...(input.estimatedCloseAt !== undefined ? { estimatedCloseAt: input.estimatedCloseAt ? new Date(input.estimatedCloseAt) : null } : {}),
      },
      include,
    });
  }

  async transition(actor: ClientActor, id: number, input: TransitionOpportunityInput) {
    const current = await this.getById(actor, id);
    if (!current) return null;
    if (stages.indexOf(input.stage) <= stages.indexOf(current.stage)) throw new Error("INVALID_STAGE_TRANSITION");

    const updated = await prisma.opportunity.updateMany({
      where: { ...access(actor), id, stage: current.stage },
      data: {
        stage: input.stage,
        outcome: input.stage === "CLOSED" ? input.outcome : null,
        outcomeAt: input.stage === "CLOSED" ? new Date() : null,
      },
    });
    if (!updated.count) throw new Error("STAGE_TRANSITION_CONFLICT");
    return this.getById(actor, id);
  }

  async listProducts() {
    return prisma.productGroup.findMany({ include: { subgroups: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } });
  }

  async listOwners(actor: ClientActor) {
    return prisma.user.findMany({
      where: { active: true, ...(actor.role === "SALES_REP" ? { id: actor.id } : {}) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }
}
