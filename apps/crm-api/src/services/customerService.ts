import { prisma } from "../client.js";
import type { CustomerCategory } from "@prisma/client";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
} from "../schemas/customer.schemas.js";

export class CustomerService {
  async create(
    data: CreateCustomerInput & { companyId: number; salesRepId: number },
  ) {
    const salesRep = await prisma.user.findUnique({
      where: { id: data.salesRepId, companyId: data.companyId },
    });
    if (!salesRep) {
      throw new Error("SALES_REP_NOT_FOUND");
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        companyId: data.companyId,
        companyName: {
          equals: data.companyName,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (existingCustomer) {
      throw new Error("DUPLICATE_CUSTOMER");
    }

    return prisma.customer.create({
      data: {
        companyId: data.companyId,
        companyName: data.companyName,
        countyName: data.countyName,
        locationAddress: data.locationAddress,
        shortHistory: data.shortHistory,
        salesRepId: data.salesRepId,
      },
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contacts: true,
      },
    });
  }

  async list(filters: ListCustomersInput & { companyId: number }) {
    const { page, limit, salesRepId, countyName, category, search, companyId } =
      filters;
    const skip = (page - 1) * limit;

    const where: {
      companyId: number;
      salesRepId?: number;
      countyName?: { contains: string; mode: "insensitive" };
      category?: CustomerCategory;
      OR?: Array<{
        companyName?: { contains: string; mode: "insensitive" };
        locationAddress?: { contains: string; mode: "insensitive" };
      }>;
    } = { companyId };

    if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (countyName) {
      where.countyName = { contains: countyName, mode: "insensitive" };
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { locationAddress: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          salesRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          contacts: true,
          _count: {
            select: {
              leads: true,
              quotations: true,
              callPlans: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: number, companyId: number) {
    const customer = await prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contacts: true,
        _count: {
          select: {
            leads: true,
            quotations: true,
            callPlans: true,
            interactions: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error("NOT_FOUND");
    }

    return customer;
  }

  async update(data: UpdateCustomerInput & { id: number; companyId: number }) {
    const { id, companyId, salesRepId, ...updateData } = data;

    await this.getById(id, companyId);

    if (salesRepId !== undefined) {
      if (salesRepId !== null) {
        const salesRep = await prisma.user.findUnique({
          where: { id: salesRepId, companyId },
        });
        if (!salesRep) {
          throw new Error("SALES_REP_NOT_FOUND");
        }
      }
    }

    return prisma.customer.update({
      where: { id },
      data: {
        ...updateData,
        ...(salesRepId !== undefined && { salesRepId }),
      },
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contacts: true,
      },
    });
  }

  async delete(id: number, companyId: number) {
    await this.getById(id, companyId);

    await prisma.customer.delete({
      where: { id },
    });
  }

  async assignSalesRep(
    customerId: number,
    salesRepId: number,
    companyId: number,
  ) {
    const [, salesRep] = await Promise.all([
      this.getById(customerId, companyId),
      prisma.user.findUnique({
        where: { id: salesRepId, companyId },
      }),
    ]);

    if (!salesRep) {
      throw new Error("SALES_REP_NOT_FOUND");
    }

    return prisma.customer.update({
      where: { id: customerId },
      data: { salesRepId },
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contacts: true,
      },
    });
  }

  async getSalesRepHistory(customerId: number, companyId: number) {
    await this.getById(customerId, companyId);

    const [assignments, interactions, quotations, leads] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          companyId,
          action: "CUSTOMER_ASSIGNED",
          description: {
            contains: `(ID: ${customerId})`,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.interaction.findMany({
        where: { customerId, companyId },
        include: {
          salesRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.quotation.findMany({
        where: { customerId, companyId },
        include: {
          salesRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.lead.findMany({
        where: { customerId, companyId },
        include: {
          salesRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const history: Array<{
      id: string;
      type: string;
      date: Date;
      salesRepId: number;
      salesRep: { id: number; firstName: string; lastName: string };
      description: string;
    }> = [];

    assignments.forEach((log) => {
      if (log.user) {
        history.push({
          id: `assignment-${log.id}`,
          type: "ASSIGNMENT",
          date: log.createdAt,
          salesRepId: log.userId || 0,
          salesRep: log.user,
          description: log.description || "Customer assigned",
        });
      }
    });

    interactions.forEach((interaction) => {
      history.push({
        id: `interaction-${interaction.id}`,
        type: "INTERACTION",
        date: interaction.interactionDate,
        salesRepId: interaction.salesRepId,
        salesRep: interaction.salesRep,
        description: `${interaction.type} - ${interaction.notes || "No notes"}`,
      });
    });

    quotations.forEach((quotation) => {
      history.push({
        id: `quotation-${quotation.id}`,
        type: "QUOTATION",
        date: quotation.createdAt,
        salesRepId: quotation.salesRepId,
        salesRep: quotation.salesRep,
        description: `Quotation ${quotation.quoteNumber} (v${quotation.version}) - ${quotation.status}`,
      });
    });

    leads.forEach((lead) => {
      history.push({
        id: `lead-${lead.id}`,
        type: "LEAD",
        date: lead.createdAt,
        salesRepId: lead.salesRepId,
        salesRep: lead.salesRep,
        description: `Lead created - ${lead.generatorRecommended} (${lead.status})`,
      });
    });

    return history.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getInteractionsByRep(customerId: number, companyId: number) {
    await this.getById(customerId, companyId);

    const interactions = await prisma.interaction.findMany({
      where: {
        customerId,
        companyId,
      },
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { interactionDate: "desc" },
    });

    type SalesRepInteractionSummary = {
      salesRepId: number;
      salesRep: {
        id: number;
        firstName: string;
        lastName: string;
      } | null;
      interactionCount: number;
      latestInteraction: Date;
    };

    const groupedByRep = interactions.reduce(
      (acc, interaction) => {
        const repId = interaction.salesRepId;
        if (!acc[repId]) {
          acc[repId] = {
            salesRepId: repId,
            salesRep: interaction.salesRep,
            interactionCount: 0,
            latestInteraction: interaction.interactionDate,
          };
        }
        acc[repId].interactionCount++;
        if (
          new Date(interaction.interactionDate) >
          new Date(acc[repId].latestInteraction)
        ) {
          acc[repId].latestInteraction = interaction.interactionDate;
        }
        return acc;
      },
      {} as Record<number, SalesRepInteractionSummary>,
    );

    return Object.values(groupedByRep);
  }
}
