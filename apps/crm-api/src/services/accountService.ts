import { prisma } from "../client.js";
import type { Prisma } from "@prisma/client";

export interface AccountActor { id: number; role: "ADMIN" | "SALES_REP" }

function access(actor: AccountActor): Prisma.AccountWhereInput {
  return { deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) };
}

const accountInclude = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  contacts: true,
} as const;

export class AccountService {
  async create(actor: AccountActor, data: { businessName: string; countyName: string; locationAddress: string; shortHistory?: string; ownerId?: number }) {
    const ownerId = actor.role === "ADMIN" ? data.ownerId ?? actor.id : actor.id;
    const owner = await prisma.user.findFirst({ where: { id: ownerId, active: true } });
    if (!owner) throw new Error("OWNER_NOT_FOUND");
    return prisma.account.create({ data: {
      ownerId, businessName: data.businessName.trim(),
      countyName: data.countyName.trim(), locationAddress: data.locationAddress.trim(), shortHistory: data.shortHistory,
    }, include: accountInclude });
  }

  async list(actor: AccountActor, filters: { page: number; limit: number; search?: string; countyName?: string; ownerId?: number }) {
    const where: Prisma.AccountWhereInput = {
      ...access(actor),
      ...(filters.ownerId && actor.role === "ADMIN" ? { ownerId: filters.ownerId } : {}),
      ...(filters.countyName ? { countyName: { contains: filters.countyName, mode: "insensitive" } } : {}),
      ...(filters.search ? { businessName: { contains: filters.search, mode: "insensitive" } } : {}),
    };
    const [accounts, total] = await prisma.$transaction([
      prisma.account.findMany({ where, skip: (filters.page - 1) * filters.limit, take: filters.limit, orderBy: { createdAt: "desc" }, include: accountInclude }),
      prisma.account.count({ where }),
    ]);
    return { accounts, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
  }

  async getById(actor: AccountActor, id: number) {
    return prisma.account.findFirst({ where: { ...access(actor), id }, include: accountInclude });
  }

  async update(actor: AccountActor, id: number, data: { businessName?: string; countyName?: string; locationAddress?: string; shortHistory?: string }) {
    const result = await prisma.account.updateMany({ where: { ...access(actor), id }, data: {
      ...(data.businessName !== undefined ? { businessName: data.businessName.trim() } : {}),
      ...(data.countyName !== undefined ? { countyName: data.countyName.trim() } : {}),
      ...(data.locationAddress !== undefined ? { locationAddress: data.locationAddress.trim() } : {}),
      ...(data.shortHistory !== undefined ? { shortHistory: data.shortHistory } : {}),
    } });
    return result.count ? this.getById(actor, id) : null;
  }

  async delete(actor: AccountActor, id: number) {
    const result = await prisma.account.updateMany({ where: { ...access(actor), id }, data: { deletedAt: new Date() } });
    return result.count > 0;
  }
}
