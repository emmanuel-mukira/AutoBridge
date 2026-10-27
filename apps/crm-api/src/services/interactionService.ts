import type { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import type { ClientActor } from "./clientService.js";
import type { CreateInteractionInput, ListInteractionsInput, UpdateInteractionInput } from "../schemas/interaction.schemas.js";

const include = {
  client: { select: { id: true, businessName: true } },
  opportunity: { select: { id: true, title: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
} as const;

function readAccess(actor: ClientActor): Prisma.InteractionWhereInput {
  return { client: { deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) } };
}

function writeAccess(actor: ClientActor): Prisma.InteractionWhereInput {
  return { ...readAccess(actor), ...(actor.role === "SALES_REP" ? { userId: actor.id } : {}) };
}

export class InteractionService {
  private async validateReferences(actor: ClientActor, clientId: number, opportunityId: number) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) },
      select: { id: true },
    });
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: opportunityId, clientId, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) },
      select: { id: true },
    });
    if (!opportunity) throw new Error("OPPORTUNITY_MISMATCH");
  }

  async create(actor: ClientActor, input: CreateInteractionInput) {
    await this.validateReferences(actor, input.clientId, input.opportunityId);
    return prisma.interaction.create({
      data: {
        clientId: input.clientId,
        opportunityId: input.opportunityId,
        userId: actor.id,
        interactionType: input.interactionType,
        notes: input.notes || null,
        occurredAt: new Date(input.occurredAt),
      },
      include,
    });
  }

  async list(actor: ClientActor, filters: ListInteractionsInput) {
    const where: Prisma.InteractionWhereInput = {
      ...readAccess(actor),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.opportunityId ? { opportunityId: filters.opportunityId } : {}),
      ...(filters.userId && actor.role === "ADMIN" ? { userId: filters.userId } : {}),
      ...(filters.interactionType ? { interactionType: filters.interactionType } : {}),
      ...(filters.startDate || filters.endDate ? {
        occurredAt: {
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        },
      } : {}),
    };
    const [interactions, total] = await prisma.$transaction([
      prisma.interaction.findMany({ where, include, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (filters.page - 1) * filters.limit, take: filters.limit }),
      prisma.interaction.count({ where }),
    ]);
    return { interactions, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
  }

  async getById(actor: ClientActor, id: number) {
    return prisma.interaction.findFirst({ where: { ...readAccess(actor), id }, include });
  }

  async update(actor: ClientActor, id: number, input: UpdateInteractionInput) {
    if (input.opportunityId !== undefined) {
      const current = await this.getById(actor, id);
      if (!current) return null;
      await this.validateReferences(actor, current.clientId, input.opportunityId);
    }
    const updated = await prisma.interaction.updateMany({
      where: { ...writeAccess(actor), id },
      data: {
        ...(input.opportunityId !== undefined ? { opportunityId: input.opportunityId } : {}),
        ...(input.interactionType !== undefined ? { interactionType: input.interactionType } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.occurredAt !== undefined ? { occurredAt: new Date(input.occurredAt) } : {}),
      },
    });
    return updated.count ? this.getById(actor, id) : null;
  }

  async delete(actor: ClientActor, id: number) {
    return (await prisma.interaction.deleteMany({ where: { ...writeAccess(actor), id } })).count > 0;
  }
}
