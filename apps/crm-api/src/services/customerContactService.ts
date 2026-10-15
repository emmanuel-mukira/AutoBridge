import { prisma } from "../client.js";
import type {
  CreateCustomerContactInput,
  UpdateCustomerContactInput,
  ListCustomerContactsInput,
} from "../schemas/customerContact.schemas.js";

export class CustomerContactService {
  async create(data: CreateCustomerContactInput & { companyId: number }) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId, companyId: data.companyId },
    });

    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    if (data.email) {
      const existingContactByEmail = await prisma.customerContact.findFirst({
        where: {
          customerId: data.customerId,
          email: {
            equals: data.email,
            mode: "insensitive",
          },
        },
      });
      if (existingContactByEmail) {
        throw new Error("DUPLICATE_CONTACT_EMAIL");
      }
    }

    if (data.phone) {
      const existingContactByPhone = await prisma.customerContact.findFirst({
        where: {
          customerId: data.customerId,
          phone: data.phone,
        },
      });
      if (existingContactByPhone) {
        throw new Error("DUPLICATE_CONTACT_PHONE");
      }
    }

    if (data.isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId: data.customerId },
        data: { isPrimary: false },
      });
    }

    return prisma.customerContact.create({
      data: {
        customerId: data.customerId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        title: data.title,
        isPrimary: data.isPrimary,
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async list(filters: ListCustomerContactsInput & { companyId: number }) {
    const { page, limit, customerId, companyId } = filters;

    const skip = (page - 1) * limit;

    const where: {
      customer: {
        companyId: number;
      };
      customerId?: number;
    } = {
      customer: {
        companyId,
      },
    };

    if (customerId) {
      where.customerId = customerId;
    }

    const [contacts, total] = await Promise.all([
      prisma.customerContact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      }),
      prisma.customerContact.count({ where }),
    ]);

    return {
      contacts,
      total,
      page,
      limit,
    };
  }

  async getById(id: number, companyId: number) {
    const contact = await prisma.customerContact.findFirst({
      where: {
        id,
        customer: {
          companyId,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            companyId: true,
          },
        },
      },
    });

    if (!contact) {
      throw new Error("NOT_FOUND");
    }

    return contact;
  }

  async update(
    data: UpdateCustomerContactInput & { id: number; companyId: number },
  ) {
    const existing = await this.getById(data.id, data.companyId);

    if (data.isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId: existing.customerId },
        data: { isPrimary: false },
      });
    }

    return prisma.customerContact.update({
      where: { id: data.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        title: data.title,
        isPrimary: data.isPrimary,
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async delete(id: number, companyId: number) {
    await this.getById(id, companyId);

    await prisma.customerContact.delete({
      where: { id },
    });
  }
}
