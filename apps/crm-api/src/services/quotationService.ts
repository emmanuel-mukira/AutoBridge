import { prisma } from "../client.js";
import type {
  CreateQuotationInput,
  UpdateQuotationInput,
  ListQuotationsInput,
  CreateNewVersionInput,
} from "../schemas/quotation.schemas.js";

export class QuotationService {
  async create(
    data: CreateQuotationInput & { companyId: number; salesRepId: number },
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId, companyId: data.companyId },
    });

    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    if (data.salesRepId) {
      const salesRep = await prisma.user.findUnique({
        where: { id: data.salesRepId, companyId: data.companyId },
      });
      if (!salesRep) {
        throw new Error("SALES_REP_NOT_FOUND");
      }
    }

    const quoteNumber = await this.generateQuoteNumber(data.companyId);

    return prisma.quotation.create({
      data: {
        companyId: data.companyId,
        quoteNumber,
        version: 1,
        customerId: data.customerId,
        salesRepId: data.salesRepId || customer.salesRepId || 0,
        leadId: data.leadId,
        totalPrice: data.totalPrice,
        discount: data.discount,
        notes: data.notes,
        status: data.status || "DRAFT",
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

  async list(filters: ListQuotationsInput & { companyId: number }) {
    const {
      page,
      limit,
      salesRepId,
      customerId,
      status,
      quoteNumber,
      companyId,
    } = filters;
    const skip = (page - 1) * limit;

    const where: {
      companyId: number;
      salesRepId?: number;
      customerId?: number;
      status?: string;
      quoteNumber?: string;
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

    if (quoteNumber) {
      where.quoteNumber = quoteNumber;
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ quoteNumber: "desc" }, { version: "desc" }],
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
      prisma.quotation.count({ where }),
    ]);

    return {
      quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: number, companyId: number) {
    const quotation = await prisma.quotation.findFirst({
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
      },
    });

    if (!quotation) {
      throw new Error("NOT_FOUND");
    }

    return quotation;
  }

  async update(data: UpdateQuotationInput & { id: number; companyId: number }) {
    const { id, companyId, ...updateData } = data;

    const existing = await this.getById(id, companyId);

    const latestVersion = await prisma.quotation.findFirst({
      where: {
        quoteNumber: existing.quoteNumber,
        companyId,
      },
      orderBy: { version: "desc" },
    });

    if (!latestVersion || latestVersion.id !== existing.id) {
      throw new Error("CANNOT_UPDATE_OLD_VERSION");
    }

    return prisma.quotation.update({
      where: { id },
      data: {
        ...updateData,
        ...(data.leadId !== undefined && { leadId: data.leadId }),
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

  async delete(id: number, companyId: number) {
    const existing = await this.getById(id, companyId);

    if (existing.status !== "DRAFT") {
      throw new Error("CANNOT_DELETE_NON_DRAFT");
    }

    const latestVersion = await prisma.quotation.findFirst({
      where: {
        quoteNumber: existing.quoteNumber,
        companyId,
      },
      orderBy: { version: "desc" },
    });

    if (!latestVersion || latestVersion.id !== existing.id) {
      throw new Error("CANNOT_DELETE_OLD_VERSION");
    }

    await prisma.$transaction([
      prisma.quotation.updateMany({
        where: { supersededBy: id },
        data: { supersededBy: null, status: "DRAFT" },
      }),
      prisma.quotation.delete({
        where: { id },
      }),
    ]);
  }

  async createNewVersion(
    id: number,
    data: CreateNewVersionInput,
    companyId: number,
  ) {
    const existing = await this.getById(id, companyId);

    const latestVersion = await prisma.quotation.findFirst({
      where: {
        quoteNumber: existing.quoteNumber,
        companyId,
      },
      orderBy: { version: "desc" },
    });

    if (!latestVersion) {
      throw new Error("NOT_FOUND");
    }

    if (latestVersion.id !== existing.id) {
      throw new Error("CANNOT_VERSION_OLD_VERSION");
    }

    const [newQuotation] = await prisma.$transaction([
      prisma.quotation.create({
        data: {
          companyId,
          quoteNumber: existing.quoteNumber,
          version: latestVersion.version + 1,
          customerId: existing.customerId,
          salesRepId: existing.salesRepId,
          leadId: existing.leadId,
          totalPrice: data.totalPrice,
          discount: data.discount,
          notes: data.notes,
          status: "DRAFT",
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
      }),
    ]);

    await prisma.quotation.update({
      where: { id: existing.id },
      data: {
        status: "SUPERSEDED",
        supersededBy: newQuotation.id,
      },
    });

    return newQuotation;
  }

  async getVersionHistory(quoteNumber: string, companyId: number) {
    const versions = await prisma.quotation.findMany({
      where: {
        quoteNumber,
        companyId,
      },
      orderBy: { version: "desc" },
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

    if (versions.length === 0) {
      throw new Error("NOT_FOUND");
    }

    return versions;
  }

  private async generateQuoteNumber(companyId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `Q${year}`;

    const lastQuote = await prisma.quotation.findFirst({
      where: {
        companyId,
        quoteNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { quoteNumber: "desc" },
    });

    if (!lastQuote) {
      return `${prefix}-0001`;
    }

    const lastNumber = parseInt(lastQuote.quoteNumber.split("-")[1] || "0");
    const nextNumber = lastNumber + 1;
    return `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
  }
}
