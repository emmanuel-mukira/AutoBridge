import { prisma } from "../client.js";
import type {
  CreateCallPlanInput,
  UpdateCallPlanInput,
  ListCallPlansInput,
} from "../schemas/callPlanner.schemas.js";

export class CallPlannerService {
  async create(input: CreateCallPlanInput & { companyId: number }) {
    const {
      companyId,
      salesRepId,
      customerId,
      contactPersonId,
      weekBeginning,
      dayOfWeek,
      plannedDate,
      purpose,
      locationType,
      exactLocation,
      productLine,
      proposedGenerator,
    } = input;

    const salesRep = await prisma.user.findUnique({
      where: { id: salesRepId },
    });
    if (!salesRep) {
      throw new Error("SALES_REP_NOT_FOUND");
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    if (contactPersonId) {
      const contact = await prisma.customerContact.findUnique({
        where: { id: contactPersonId },
      });
      if (!contact || contact.customerId !== customerId) {
        throw new Error("CONTACT_NOT_FOUND_OR_MISMATCH");
      }
    }

    const callPlan = await prisma.callPlan.create({
      data: {
        companyId,
        salesRepId,
        customerId,
        contactPersonId: contactPersonId || null,
        weekBeginning: new Date(weekBeginning),
        dayOfWeek,
        plannedDate: new Date(plannedDate),
        purpose,
        locationType,
        exactLocation,
        productLine,
        proposedGenerator,
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
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
          },
        },
        contactPerson: {
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

    return callPlan;
  }

  async getById(id: number, companyId: number) {
    const callPlan = await prisma.callPlan.findUnique({
      where: { id },
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
          },
        },
        contactPerson: {
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

    if (!callPlan || callPlan.companyId !== companyId) {
      throw new Error("NOT_FOUND");
    }

    return callPlan;
  }

  async list(input: ListCallPlansInput & { companyId: number }) {
    const { companyId, salesRepId, startDate, endDate, isCompleted } = input;

    const where: Record<string, unknown> = {
      companyId,
    };

    if (salesRepId !== undefined) {
      where.salesRepId = salesRepId;
    }

    if (startDate || endDate) {
      where.plannedDate = {};
      if (startDate) {
        (where.plannedDate as Record<string, unknown>).gte = new Date(
          startDate,
        );
      }
      if (endDate) {
        (where.plannedDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted;
    }

    const callPlans = await prisma.callPlan.findMany({
      where,
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
          },
        },
        contactPerson: {
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
      orderBy: {
        plannedDate: "asc",
      },
    });

    return callPlans;
  }

  async update(input: UpdateCallPlanInput & { id: number; companyId: number }) {
    const {
      id,
      companyId,
      customerId,
      contactPersonId,
      weekBeginning,
      dayOfWeek,
      plannedDate,
      purpose,
      locationType,
      exactLocation,
      productLine,
      proposedGenerator,
      isCompleted,
    } = input;

    const existing = await prisma.callPlan.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new Error("NOT_FOUND");
    }

    if (customerId !== undefined && customerId !== null) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || customer.companyId !== companyId) {
        throw new Error("CUSTOMER_NOT_FOUND");
      }
    }

    if (contactPersonId !== undefined && contactPersonId !== null) {
      const contact = await prisma.customerContact.findUnique({
        where: { id: contactPersonId },
      });
      const targetCustomerId = customerId || existing.customerId;
      if (!contact || contact.customerId !== targetCustomerId) {
        throw new Error("CONTACT_NOT_FOUND_OR_MISMATCH");
      }
    }

    const data: Record<string, unknown> = {};
    if (customerId !== undefined) data.customerId = customerId;
    if (contactPersonId !== undefined) data.contactPersonId = contactPersonId;
    if (weekBeginning !== undefined)
      data.weekBeginning = new Date(weekBeginning);
    if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek;
    if (plannedDate !== undefined) data.plannedDate = new Date(plannedDate);
    if (purpose !== undefined) data.purpose = purpose;
    if (locationType !== undefined) data.locationType = locationType;
    if (exactLocation !== undefined) data.exactLocation = exactLocation;
    if (productLine !== undefined) data.productLine = productLine;
    if (proposedGenerator !== undefined)
      data.proposedGenerator = proposedGenerator;
    if (isCompleted !== undefined) data.isCompleted = isCompleted;

    const updated = await prisma.callPlan.update({
      where: { id },
      data,
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
          },
        },
        contactPerson: {
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

    return updated;
  }

  async delete(id: number, companyId: number) {
    const existing = await prisma.callPlan.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new Error("NOT_FOUND");
    }

    await prisma.callPlan.delete({ where: { id } });
  }

  async markCompleted(
    id: number,
    companyId: number,
    notes?: string,
    contactPersonId?: number | null,
  ) {
    const existing = await prisma.callPlan.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new Error("NOT_FOUND");
    }

    if (contactPersonId !== undefined && contactPersonId !== null) {
      const contact = await prisma.customerContact.findUnique({
        where: { id: contactPersonId },
      });
      if (!contact || contact.customerId !== existing.customerId) {
        throw new Error("CONTACT_NOT_FOUND_OR_MISMATCH");
      }
    }

    const data: Record<string, unknown> = {
      isCompleted: true,
      completedAt: new Date(),
    };
    if (notes !== undefined) data.notes = notes;
    if (contactPersonId !== undefined) data.contactPersonId = contactPersonId;

    const updated = await prisma.callPlan.update({
      where: { id },
      data,
      include: {
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            companyName: true,
            countyName: true,
          },
        },
        contactPerson: {
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

    return updated;
  }
}
