import { Request, Response } from "express";
import { LeadService } from "../services/leadService.js";
import logger from "../lib/logger.js";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  ListLeadsSchema,
  LeadIdSchema,
} from "../schemas/lead.schemas.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AnalyticsEvents } from "../services/analyticsService.js";

const leadService = new LeadService();

export async function create(req: Request, res: Response) {
  const parsed = CreateLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid lead data", details: parsed.error });
  }

  const user = req.user!;
  const isAdmin = user.groups.includes("admin");

  if (
    !isAdmin &&
    parsed.data.salesRepId &&
    parsed.data.salesRepId !== user.id
  ) {
    return res
      .status(403)
      .json({ error: "Cannot create leads for other sales reps" });
  }

  try {
    const lead = await leadService.create({
      ...parsed.data,
      companyId: user.companyId,
      salesRepId: parsed.data.salesRepId || user.id,
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "LEAD_CREATED",
      description: `Created lead (ID: ${lead.id}) for customer ${lead.customer.companyName} with status ${lead.status}`,
      req,
    });
    AnalyticsEvents.leadCreated(req, lead.salesRepId);

    return res.status(201).json(lead);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(400).json({ error: "Customer not found" });
    }
    if (message === "SALES_REP_NOT_FOUND") {
      return res.status(400).json({ error: "Sales rep not found" });
    }
    if (message === "DUPLICATE_LEAD") {
      return res.status(409).json({
        error:
          "A lead with this generator recommendation already exists for this customer",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function list(req: Request, res: Response) {
  const parsed = ListLeadsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid query parameters", details: parsed.error });
  }

  const user = req.user!;
  const isAdmin = user.groups.includes("admin");

  const filters = { ...parsed.data, companyId: user.companyId };
  if (!isAdmin) {
    filters.salesRepId = user.id;
  }

  try {
    const result = await leadService.list(filters);
    return res.json(result);
  } catch (error) {
    logger.error({ err: error }, "lead list failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getById(req: Request, res: Response) {
  const parsed = LeadIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid lead ID" });
  }

  const user = req.user!;

  try {
    const lead = await leadService.getById(parsed.data.id, user.companyId);

    if (!user.groups.includes("admin") && lead.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(lead);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Lead not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function update(req: Request, res: Response) {
  const parsedId = LeadIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid lead ID" });
  }

  const parsedBody = UpdateLeadSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid update data" });
  }

  const user = req.user!;

  try {
    const existing = await leadService.getById(
      parsedId.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await leadService.update({
      ...parsedBody.data,
      id: parsedId.data.id,
      companyId: user.companyId,
    });

    const statusChanged = existing.status !== updated.status;
    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: statusChanged ? "LEAD_STATUS_CHANGED" : "LEAD_UPDATED",
      description: statusChanged
        ? `Lead (ID: ${updated.id}) status changed from ${existing.status} to ${updated.status}`
        : `Updated lead (ID: ${updated.id}) for customer ${updated.customer.companyName}`,
      req,
    });
    if (statusChanged && updated.status === "WON") {
      AnalyticsEvents.leadWon(req, updated.id);
    } else if (statusChanged && updated.status === "LOST") {
      AnalyticsEvents.leadLost(req, updated.id);
    }

    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Lead not found" });
    }
    if (message === "STATUS_LOCKED") {
      return res.status(422).json({
        error: "Cannot change status of a lead that is already Won or Lost",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteLead(req: Request, res: Response) {
  const parsed = LeadIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid lead ID" });
  }

  const user = req.user!;

  try {
    const existing = await leadService.getById(parsed.data.id, user.companyId);

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await leadService.delete(parsed.data.id, user.companyId);

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "LEAD_DELETED",
      description: `Deleted lead (ID: ${existing.id}) for customer ${existing.customer.companyName}`,
      req,
    });
    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Lead not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
