import { prisma } from "../client.js";
import type { ListAuditLogsInput } from "../schemas/auditLog.schemas.js";

export class AuditLogService {
  async list(filters: ListAuditLogsInput & { companyId: number }) {
    const { page, limit, userId, action, startDate, endDate, companyId } =
      filters;

    const skip = (page - 1) * limit;

    const where: {
      companyId: number;
      userId?: number;
      action?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = { companyId };

    if (userId !== undefined) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: number, companyId: number) {
    const log = await prisma.auditLog.findFirst({
      where: { id, companyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!log) {
      throw new Error("NOT_FOUND");
    }

    return log;
  }
}
