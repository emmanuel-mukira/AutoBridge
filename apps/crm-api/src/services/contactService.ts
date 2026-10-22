import { prisma } from "../client.js";
import type { Prisma } from "@prisma/client";
import { ClientService, type ClientActor } from "./clientService.js";

type ContactData = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  isPrimary?: boolean;
};

function access(actor: ClientActor): Prisma.ContactWhereInput {
  return { client: { deletedAt: null, ...(actor.role === "SALES_REP" ? { ownerId: actor.id } : {}) } };
}

function clean(data: Partial<ContactData>) {
  return {
    ...(data.firstName !== undefined ? { firstName: data.firstName.trim() } : {}),
    ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
    ...(data.email !== undefined ? { email: data.email || null } : {}),
    ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
    ...(data.title !== undefined ? { title: data.title || null } : {}),
    ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
  };
}

export class ContactService {
  private clients = new ClientService();

  async create(actor: ClientActor, data: ContactData & { clientId: number }) {
    if (!await this.clients.getById(actor, data.clientId)) return null;
    return prisma.contact.create({ data: { clientId: data.clientId, ...clean(data), firstName: data.firstName.trim(), lastName: data.lastName.trim() } });
  }

  async list(actor: ClientActor, filters: { clientId?: number; page: number; limit: number }) {
    const where = { ...access(actor), ...(filters.clientId ? { clientId: filters.clientId } : {}) };
    const [contacts, total] = await prisma.$transaction([
      prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * filters.limit, take: filters.limit }),
      prisma.contact.count({ where }),
    ]);
    return { contacts, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
  }

  async getById(actor: ClientActor, id: number) {
    return prisma.contact.findFirst({ where: { ...access(actor), id } });
  }

  async update(actor: ClientActor, id: number, data: Partial<ContactData>) {
    const result = await prisma.contact.updateMany({ where: { ...access(actor), id }, data: clean(data) });
    return result.count ? this.getById(actor, id) : null;
  }

  async delete(actor: ClientActor, id: number) {
    const result = await prisma.contact.deleteMany({ where: { ...access(actor), id } });
    return result.count > 0;
  }
}
