import type { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import { followUpMinutes } from "./weeklyPlanningRules.js";
import { followUpsOverlap } from "./followUpSchedule.js";
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
  private async assertAvailable(tx: Prisma.TransactionClient, ownerId: number, dueAt: Date, minutes: number, excludeId?: number) {
    // The owner lock serializes competing schedule writes across API instances.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(${ownerId})`;
    const end = new Date(dueAt.getTime() + minutes * 60_000);
    const existing = await tx.followUp.findMany({
      where: { ownerId, completedAt: null, dueAt: { gte: new Date(dueAt.getTime() - 4_800 * 60_000), lt: end }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { dueAt: true, estimatedMinutes: true, channel: true },
    });
    if (existing.some((item) => followUpsOverlap(dueAt, minutes, item.dueAt, item.estimatedMinutes ?? followUpMinutes(item.channel)))) throw new Error("FOLLOW_UP_TIME_CONFLICT");
  }

  async availability(actor: ClientActor, clientId: number, start: Date, end: Date) {
    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) }, select: { ownerId: true } });
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    const items = await prisma.followUp.findMany({
      where: { ownerId: client.ownerId, completedAt: null, dueAt: { gte: new Date(start.getTime() - 4_800 * 60_000), lt: end } },
      select: { id: true, dueAt: true, estimatedMinutes: true, channel: true }, orderBy: { dueAt: "asc" },
    });
    return items.filter((item) => item.dueAt.getTime() + (item.estimatedMinutes ?? followUpMinutes(item.channel)) * 60_000 > start.getTime())
      .map((item) => ({ id: item.id, start: item.dueAt, end: new Date(item.dueAt.getTime() + (item.estimatedMinutes ?? followUpMinutes(item.channel)) * 60_000) }));
  }
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
    const opportunity = await prisma.opportunity.findFirst({ where: { id: input.opportunityId, clientId: input.clientId, ownerId }, select: { id: true } });
    if (!opportunity) throw new Error("OPPORTUNITY_MISMATCH");
    return ownerId;
  }

  async create(actor: ClientActor, input: CreateFollowUpInput) {
    const ownerId = await this.validateReferences(actor, input);
    if (input.appointmentConfirmed && !["MEETING", "SITE_VISIT"].includes(input.channel)) throw new Error("INVALID_APPOINTMENT_CONFIRMATION");
    const dueAt = new Date(input.dueAt);
    const estimatedMinutes = input.estimatedMinutes ?? followUpMinutes(input.channel);
    return prisma.$transaction(async (tx) => {
      await this.assertAvailable(tx, ownerId, dueAt, estimatedMinutes);
      return tx.followUp.create({
        data: { clientId: input.clientId, opportunityId: input.opportunityId, ownerId, title: input.title.trim(), channel: input.channel, dueAt, estimatedMinutes, appointmentConfirmed: input.appointmentConfirmed }, include,
      });
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
    const current = await this.getById(actor, id);
    if (!current) return null;
    const channel = input.channel ?? current.channel;
    if (input.channel === "FOLLOW_UP" && current.channel !== "FOLLOW_UP") throw new Error("INVALID_FOLLOW_UP_CHANNEL");
    const confirmed = input.appointmentConfirmed ?? (input.channel && input.channel !== current.channel ? false : current.appointmentConfirmed);
    const estimatedMinutes = input.estimatedMinutes !== undefined
      ? input.estimatedMinutes ?? followUpMinutes(channel)
      : input.channel && (current.estimatedMinutes === null || current.estimatedMinutes === followUpMinutes(current.channel))
        ? followUpMinutes(channel) : current.estimatedMinutes;
    if (confirmed && !["MEETING", "SITE_VISIT"].includes(channel ?? "")) throw new Error("INVALID_APPOINTMENT_CONFIRMATION");
    if (input.opportunityId !== undefined) {
      const opportunity = await prisma.opportunity.findFirst({
        where: { id: input.opportunityId, clientId: current.clientId, ownerId: current.ownerId },
        select: { id: true },
      });
      if (!opportunity) throw new Error("OPPORTUNITY_MISMATCH");
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (!current.completedAt) await this.assertAvailable(tx, current.ownerId, new Date(input.dueAt ?? current.dueAt), estimatedMinutes ?? followUpMinutes(channel), id);
      return tx.followUp.updateMany({
        where: { ...access(actor), id }, data: {
        ...(input.opportunityId !== undefined ? { opportunityId: input.opportunityId } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.dueAt !== undefined ? { dueAt: new Date(input.dueAt) } : {}),
        estimatedMinutes,
        appointmentConfirmed: confirmed,
        },
      });
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
