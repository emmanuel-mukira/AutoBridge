import { Request } from "express";
import { prisma } from "../client.js";
import logger from "../lib/logger.js";

interface AuditLogData {
  companyId: number;
  userId: number;
  action: string;
  description: string;
  req: Request;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        action: data.action,
        description: data.description,
        ipAddress: data.req.ip || data.req.socket.remoteAddress || null,
        userAgent: data.req.get("user-agent") || null,
      },
    });
    logger.info(
      {
        audit: true,
        companyId: data.companyId,
        userId: data.userId,
        action: data.action,
        description: data.description,
      },
      "audit event",
    );
  } catch (error) {
    logger.error(
      { err: error, action: data.action },
      "failed to create audit log",
    );
  }
}
