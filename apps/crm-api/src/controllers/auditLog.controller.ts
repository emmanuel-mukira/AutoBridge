import { Request, Response } from "express";
import { AuditLogService } from "../services/auditLogService.js";
import logger from "../lib/logger.js";
import {
  ListAuditLogsSchema,
  AuditLogIdSchema,
} from "../schemas/auditLog.schemas.js";

const auditLogService = new AuditLogService();

export async function list(req: Request, res: Response) {
  const parsed = ListAuditLogsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid query parameters", details: parsed.error });
  }

  const user = req.user!;

  try {
    const result = await auditLogService.list({
      ...parsed.data,
      companyId: user.companyId,
    });

    const response = {
      logs: result.data,
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit,
      totalPages: result.pagination.totalPages,
    };

    return res.json(response);
  } catch (error) {
    logger.error({ err: error }, "audit log list failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getById(req: Request, res: Response) {
  const parsed = AuditLogIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid audit log ID" });
  }

  const user = req.user!;

  try {
    const log = await auditLogService.getById(parsed.data.id, user.companyId);
    return res.json(log);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Audit log not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
