import { prisma } from "../client.js";
import logger from "../lib/logger.js";
import type {
  CreateInteractionInput,
  UpdateInteractionInput,
  ListInteractionsInput,
} from "../schemas/interaction.schemas.js";

export class InteractionService {
  async create(
    data: CreateInteractionInput & { companyId: number; salesRepId: number },
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

    let contactId = data.contactId;

    if (data.contact) {
      const newContact = await prisma.customerContact.create({
        data: {
          customerId: data.customerId,
          firstName: data.contact.firstName,
          lastName: data.contact.lastName,
          email: data.contact.email || null,
          phone: data.contact.phone || null,
          title: data.contact.title || null,
          isPrimary: data.contact.isPrimary,
        },
      });
      contactId = newContact.id;
    } else if (data.contactId) {
      const contact = await prisma.customerContact.findFirst({
        where: {
          id: data.contactId,
          customerId: data.customerId,
        },
      });
      if (!contact) {
        throw new Error("CONTACT_NOT_FOUND_OR_MISMATCH");
      }
    }

    if (data.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: data.leadId, companyId: data.companyId },
      });
      if (!lead) {
        throw new Error("LEAD_NOT_FOUND");
      }
    }

    if (data.quotationId) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: data.quotationId, companyId: data.companyId },
      });
      if (!quotation) {
        throw new Error("QUOTATION_NOT_FOUND");
      }
    }

    const interactionDate = data.interactionDate
      ? new Date(data.interactionDate)
      : new Date();
    const oneMinuteAgo = new Date(interactionDate.getTime() - 1 * 60 * 1000);
    const oneMinuteLater = new Date(interactionDate.getTime() + 1 * 60 * 1000);

    const duplicateInteraction = await prisma.interaction.findFirst({
      where: {
        customerId: data.customerId,
        salesRepId: data.salesRepId,
        contactId: contactId || null,
        type: data.type,
        interactionDate: {
          gte: oneMinuteAgo,
          lte: oneMinuteLater,
        },
      },
    });

    if (duplicateInteraction) {
      throw new Error("DUPLICATE_INTERACTION");
    }

    try {
      return await prisma.interaction.create({
        data: {
          companyId: data.companyId,
          customerId: data.customerId,
          salesRepId: data.salesRepId,
          contactId: contactId || null,
          leadId: data.leadId || null,
          quotationId: data.quotationId || null,
          type: data.type,
          interactionDate: data.interactionDate
            ? new Date(data.interactionDate)
            : new Date(),
          notes: data.notes,
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
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error({ err: error }, "prisma error creating interaction");
      throw error;
    }
  }

  async list(filters: ListInteractionsInput & { companyId: number }) {
    const {
      page,
      limit,
      type,
      salesRepId,
      customerId,
      contactId,
      leadId,
      quotationId,
      startDate,
      endDate,
      companyId,
    } = filters;
    const skip = (page - 1) * limit;

    const where: {
      companyId: number;
      type?: "CALL" | "EMAIL" | "MEETING" | "SITE_VISIT" | "FOLLOW_UP";
      salesRepId?: number;
      customerId?: number;
      contactId?: number;
      leadId?: number;
      quotationId?: number;
      interactionDate?: {
        gte?: Date;
        lte?: Date;
      };
    } = { companyId };

    if (type) {
      where.type = type as
        | "CALL"
        | "EMAIL"
        | "MEETING"
        | "SITE_VISIT"
        | "FOLLOW_UP";
    }

    if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (contactId) {
      where.contactId = contactId;
    }

    if (leadId) {
      where.leadId = leadId;
    }

    if (quotationId) {
      where.quotationId = quotationId;
    }

    if (startDate || endDate) {
      where.interactionDate = {};
      if (startDate) {
        where.interactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.interactionDate.lte = new Date(endDate);
      }
    }

    const [interactions, total] = await Promise.all([
      prisma.interaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { interactionDate: "desc" },
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
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.interaction.count({ where }),
    ]);

    return {
      interactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: number, companyId: number) {
    const interaction = await prisma.interaction.findFirst({
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
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!interaction) {
      throw new Error("NOT_FOUND");
    }

    return interaction;
  }

  async update(
    data: UpdateInteractionInput & { id: number; companyId: number },
  ) {
    const { id, companyId, contactId, interactionDate, notes } = data;

    const existing = await this.getById(id, companyId);

    if (contactId !== undefined && contactId !== null) {
      const contact = await prisma.customerContact.findFirst({
        where: {
          id: contactId,
          customerId: existing.customerId,
        },
      });
      if (!contact) {
        throw new Error("CONTACT_NOT_FOUND_OR_MISMATCH");
      }
    }

    return prisma.interaction.update({
      where: { id },
      data: {
        ...(contactId !== undefined && { contactId }),
        ...(data.leadId !== undefined && { leadId: data.leadId }),
        ...(data.quotationId !== undefined && {
          quotationId: data.quotationId,
        }),
        ...(interactionDate && { interactionDate: new Date(interactionDate) }),
        ...(notes && { notes }),
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
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async delete(id: number, companyId: number) {
    await this.getById(id, companyId);

    await prisma.interaction.delete({
      where: { id },
    });
  }

  async getByCustomer(customerId: number, companyId: number) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    return prisma.interaction.findMany({
      where: {
        customerId,
        companyId,
      },
      orderBy: { interactionDate: "desc" },
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}
