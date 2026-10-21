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

  async update(actor: AccountActor, id: number, data: { businessName?: string; countyName?: string; locationAddress?: string; shortHistory?: string; ownerId?: number }) {
    if (data.ownerId !== undefined) {
      const owner = await prisma.user.findFirst({ where: { id: data.ownerId, active: true } });
      if (!owner) throw new Error("OWNER_NOT_FOUND");
      const account = await prisma.account.findFirst({ where: { ...access(actor), id }, select: { ownerId: true, _count: { select: { opportunities: true } } } });
      if (!account) return null;
      if (account.ownerId !== data.ownerId && account._count.opportunities > 0) throw new Error("ACCOUNT_HAS_OPPORTUNITIES");
    }
    const result = await prisma.account.updateMany({ where: { ...access(actor), id }, data: {
      ...(data.businessName !== undefined ? { businessName: data.businessName.trim() } : {}),
      ...(data.countyName !== undefined ? { countyName: data.countyName.trim() } : {}),
      ...(data.locationAddress !== undefined ? { locationAddress: data.locationAddress.trim() } : {}),
      ...(data.shortHistory !== undefined ? { shortHistory: data.shortHistory } : {}),
      ...(data.ownerId !== undefined && actor.role === "ADMIN" ? { ownerId: data.ownerId } : {}),
    } });
    return result.count ? this.getById(actor, id) : null;
  }

  async listOwners(actor: AccountActor) {
    return prisma.user.findMany({
      where: { active: true, ...(actor.role === "SALES_REP" ? { id: actor.id } : {}) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }

  async delete(actor: AccountActor, id: number) {
    const result = await prisma.account.updateMany({ where: { ...access(actor), id }, data: { deletedAt: new Date() } });
    return result.count > 0;
  }
}
