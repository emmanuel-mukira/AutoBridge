import type { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import type { ClientActor } from "./clientService.js";
import type { CreateFollowUpInput, ListFollowUpsInput, UpdateFollowUpInput } from "../schemas/followUp.schemas.js";

const include = {
  client: { select: { id: true, businessName: true } },
  opportunity: { select: { id: true, title: true } },
  owner: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
} as const;

function access(actor: ClientActor): Prisma.FollowUpWhereInput {
  return {
    client: { deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) },
    ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}),
  };
}

export class FollowUpService {
  private async validateReferences(actor: ClientActor, input: CreateFollowUpInput) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) },
      select: { id: true, ownerId: true },
    });
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    const ownerId = actor.role === "ADMIN" ? input.ownerId ?? client.ownerId : actor.id;
    const owner = await prisma.user.findFirst({ where: { id: ownerId, active: true }, select: { id: true } });
    if (!owner) throw new Error("OWNER_NOT_FOUND");
    if (client.ownerId !== ownerId) throw new Error("CLIENT_OWNER_MISMATCH");
    if (input.opportunityId) {
      const opportunity = await prisma.opportunity.findFirst({ where: { id: input.opportunityId, clientId: input.clientId, ownerId }, select: { id: true } });
      if (!opportunity) throw new Error("OPPORTUNITY_MISMATCH");
    }
    return ownerId;
  }

  async create(actor: ClientActor, input: CreateFollowUpInput) {
    const ownerId = await this.validateReferences(actor, input);
    return prisma.followUp.create({
      data: { clientId: input.clientId, opportunityId: input.opportunityId ?? null, ownerId, title: input.title.trim(), channel: input.channel, dueAt: new Date(input.dueAt) },
      include,
    });
  }

  async list(actor: ClientActor, filters: ListFollowUpsInput) {
    const where: Prisma.FollowUpWhereInput = {
      ...access(actor),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.opportunityId ? { opportunityId: filters.opportunityId } : {}),
      ...(filters.ownerId && actor.role === "ADMIN" ? { ownerId: filters.ownerId } : {}),
      ...(filters.completed === undefined ? {} : { completedAt: filters.completed ? { not: null } : null }),
      ...(filters.startDate || filters.endDate ? {
        dueAt: {
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        },
      } : {}),
    };
    const [followUps, total] = await prisma.$transaction([
      prisma.followUp.findMany({ where, include, orderBy: [{ dueAt: "asc" }, { id: "asc" }], skip: (filters.page - 1) * filters.limit, take: filters.limit }),
      prisma.followUp.count({ where }),
    ]);
    return { followUps, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
  }

  async getById(actor: ClientActor, id: number) {
    return prisma.followUp.findFirst({ where: { ...access(actor), id }, include });
  }

  async update(actor: ClientActor, id: number, input: UpdateFollowUpInput) {
    const updated = await prisma.followUp.updateMany({
      where: { ...access(actor), id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.dueAt !== undefined ? { dueAt: new Date(input.dueAt) } : {}),
      },
    });
    return updated.count ? this.getById(actor, id) : null;
  }

  async complete(actor: ClientActor, id: number) {
    const current = await this.getById(actor, id);
    if (!current) return null;
    if (!current.completedAt) await prisma.followUp.updateMany({ where: { ...access(actor), id, completedAt: null }, data: { completedAt: new Date() } });
    return this.getById(actor, id);
  }
}
