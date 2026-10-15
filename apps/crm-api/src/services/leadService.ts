import { prisma } from "../client.js";
import type {
  CreateLeadInput,
  UpdateLeadInput,
  ListLeadsInput,
} from "../schemas/lead.schemas.js";

export class LeadService {
  async create(
    data: CreateLeadInput & { companyId: number; salesRepId: number },
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId, companyId: data.companyId },
    });

    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    const salesRep = await prisma.user.findUnique({
      where: { id: data.salesRepId, companyId: data.companyId },
    });

    if (!salesRep) {
      throw new Error("SALES_REP_NOT_FOUND");
    }

    if (data.generatorRecommended) {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const existingLead = await prisma.lead.findFirst({
        where: {
          customerId: data.customerId,
          companyId: data.companyId,
          generatorRecommended: {
            equals: data.generatorRecommended,
            mode: "insensitive",
          },
          status: {
            in: ["DRAFT", "OPEN"],
          },
          createdAt: {
            gte: oneDayAgo,
          },
        },
      });

      if (existingLead) {
        throw new Error("DUPLICATE_LEAD");
      }
    }

    return prisma.lead.create({
      data: {
        companyId: data.companyId,
        customerId: data.customerId,
        salesRepId: data.salesRepId || customer.salesRepId || 0,
        generatorRecommended: data.generatorRecommended,
        status: data.status || "OPEN",
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
            locationAddress: true,
          },
        },
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async list(filters: ListLeadsInput & { companyId: number }) {
    const { page, limit, salesRepId, customerId, status, companyId } = filters;
    const skip = (page - 1) * limit;

    const where: {
      companyId: number;
      salesRepId?: number;
      customerId?: number;
      status?: string;
    } = { companyId };

    if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              countyName: true,
              locationAddress: true,
            },
          },
          salesRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: number, companyId: number) {
    const lead = await prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
            locationAddress: true,
          },
        },
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        quotations: {
          select: {
            id: true,
            quoteNumber: true,
            version: true,
            totalPrice: true,
            discount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        interactions: {
          select: {
            id: true,
            type: true,
            interactionDate: true,
            notes: true,
            createdAt: true,
          },
          orderBy: { interactionDate: "desc" },
          take: 10,
        },
      },
    });

    if (!lead) {
      throw new Error("NOT_FOUND");
    }

    return lead;
  }

  async update(data: UpdateLeadInput & { id: number; companyId: number }) {
    const { id, companyId, ...updateData } = data;

    const existing = await this.getById(id, companyId);

    if (
      updateData.status &&
      updateData.status !== existing.status &&
      (existing.status === "WON" || existing.status === "LOST")
    ) {
      throw new Error("STATUS_LOCKED");
    }

    return prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
            locationAddress: true,
          },
        },
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: number, companyId: number) {
    await this.getById(id, companyId);

    await prisma.lead.delete({
      where: { id },
    });
  }
}
