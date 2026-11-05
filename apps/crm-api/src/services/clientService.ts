import { prisma } from "../client.js";
import type { Prisma } from "@prisma/client";

export interface ClientActor { id: number; role: "ADMIN" | "SALES_REP" }

function access(actor: ClientActor): Prisma.ClientWhereInput {
  return { deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) };
}

const clientInclude = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  contacts: true,
} as const;

export class ClientService {
  async create(actor: ClientActor, data: { businessName: string; countyName: string; locationAddress: string; shortHistory?: string; ownerId?: number }) {
    const ownerId = actor.role === "ADMIN" ? data.ownerId ?? actor.id : actor.id;
    const owner = await prisma.user.findFirst({ where: { id: ownerId, active: true, approvedAt: { not: null } } });
    if (!owner) throw new Error("OWNER_NOT_FOUND");
    return prisma.client.create({ data: {
      ownerId, businessName: data.businessName.trim(),
      countyName: data.countyName.trim(), locationAddress: data.locationAddress.trim(), shortHistory: data.shortHistory,
    }, include: clientInclude });
  }

  async list(actor: ClientActor, filters: { page: number; limit: number; search?: string; countyName?: string; ownerId?: number }) {
    const where: Prisma.ClientWhereInput = {
      ...access(actor),
      ...(filters.ownerId && actor.role === "ADMIN" ? { ownerId: filters.ownerId } : {}),
      ...(filters.countyName ? { countyName: { contains: filters.countyName, mode: "insensitive" } } : {}),
      ...(filters.search ? { businessName: { contains: filters.search, mode: "insensitive" } } : {}),
    };
    const [clients, total] = await prisma.$transaction([
      prisma.client.findMany({ where, skip: (filters.page - 1) * filters.limit, take: filters.limit, orderBy: { createdAt: "desc" }, include: clientInclude }),
      prisma.client.count({ where }),
    ]);
    return { clients, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
  }

  async getById(actor: ClientActor, id: number) {
    return prisma.client.findFirst({ where: { ...access(actor), id }, include: clientInclude });
  }

  async update(actor: ClientActor, id: number, data: { businessName?: string; countyName?: string; locationAddress?: string; shortHistory?: string; ownerId?: number }) {
    const current = await prisma.client.findFirst({ where: { ...access(actor), id }, select: { ownerId: true } });
    if (!current) return null;
    if (data.ownerId !== undefined) {
      const owner = await prisma.user.findFirst({ where: { id: data.ownerId, active: true, approvedAt: { not: null } } });
      if (!owner) throw new Error("OWNER_NOT_FOUND");
    }
    const reassigning = actor.role === "ADMIN" && data.ownerId !== undefined && data.ownerId !== current.ownerId;
    await prisma.$transaction(async (tx) => {
      await tx.client.update({ where: { id }, data: {
        ...(data.businessName !== undefined ? { businessName: data.businessName.trim() } : {}),
        ...(data.countyName !== undefined ? { countyName: data.countyName.trim() } : {}),
        ...(data.locationAddress !== undefined ? { locationAddress: data.locationAddress.trim() } : {}),
        ...(data.shortHistory !== undefined ? { shortHistory: data.shortHistory } : {}),
        ...(reassigning ? { ownerId: data.ownerId } : {}),
      } });
      if (reassigning) {
        await tx.opportunity.updateMany({ where: { clientId: id }, data: { ownerId: data.ownerId } });
        await tx.followUp.updateMany({ where: { clientId: id }, data: { ownerId: data.ownerId } });
      }
    });
    return this.getById(actor, id);
  }

  async listOwners(actor: ClientActor) {
    return prisma.user.findMany({
      where: { active: true, approvedAt: { not: null }, ...(actor.role === "SALES_REP" ? { id: actor.id } : {}) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }

  async delete(actor: ClientActor, id: number) {
    const result = await prisma.client.updateMany({ where: { ...access(actor), id }, data: { deletedAt: new Date() } });
    return result.count > 0;
  }
}
