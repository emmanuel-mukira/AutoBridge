import { Request, Response } from "express";
import { CallPlannerService } from "../services/callPlannerService.js";
import logger from "../lib/logger.js";
import {
  CreateCallPlanSchema,
  UpdateCallPlanSchema,
  ListCallPlansSchema,
  CallPlanIdSchema,
  MarkCompletedSchema,
} from "../schemas/callPlanner.schemas.js";
import { AnalyticsEvents } from "../services/analyticsService.js";

const callPlannerService = new CallPlannerService();

export async function create(req: Request, res: Response) {
  const parsed = CreateCallPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid call plan data", details: parsed.error });
  }

  const user = req.user!;

  if (!user.groups.includes("admin") && parsed.data.salesRepId !== user.id) {
    return res
      .status(403)
      .json({ error: "Cannot create plans for other users" });
  }

  try {
    const callPlan = await callPlannerService.create({
      ...parsed.data,
      companyId: user.companyId,
    });

    return res.status(201).json(callPlan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "SALES_REP_NOT_FOUND") {
      return res.status(400).json({ error: "Sales rep not found" });
    }
    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(400).json({ error: "Customer not found" });
    }
    if (message === "CONTACT_NOT_FOUND_OR_MISMATCH") {
      return res.status(400).json({
        error: "Contact person not found or does not belong to customer",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getById(req: Request, res: Response) {
  const parsed = CallPlanIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid call plan ID" });
  }

  const user = req.user!;

  try {
    const callPlan = await callPlannerService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && callPlan.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(callPlan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Call plan not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function list(req: Request, res: Response) {
  const parsed = ListCallPlansSchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid query parameters", details: parsed.error });
  }

  const user = req.user!;

  const filters = { ...parsed.data, companyId: user.companyId };
  if (!user.groups.includes("admin")) {
    filters.salesRepId = user.id;
  }

  try {
    const callPlans = await callPlannerService.list(filters);

    const response = {
      callPlans,
      total: callPlans.length,
    };

    return res.json(response);
  } catch (error) {
    logger.error({ err: error }, "call planner list failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function update(req: Request, res: Response) {
  const parsedId = CallPlanIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid call plan ID" });
  }

  const parsedBody = UpdateCallPlanSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid update data" });
  }

  const user = req.user!;

  try {
    const existing = await callPlannerService.getById(
      parsedId.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await callPlannerService.update({
      ...parsedBody.data,
      id: parsedId.data.id,
      companyId: user.companyId,
    });

    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Call plan not found" });
    }
    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(400).json({ error: "Customer not found" });
    }
    if (message === "CONTACT_NOT_FOUND_OR_MISMATCH") {
      return res.status(400).json({
        error: "Contact person not found or does not belong to customer",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCallPlan(req: Request, res: Response) {
  const parsed = CallPlanIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid call plan ID" });
  }

  const user = req.user!;

  try {
    const existing = await callPlannerService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await callPlannerService.delete(parsed.data.id, user.companyId);

    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Call plan not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function markCompleted(req: Request, res: Response) {
  const parsedId = CallPlanIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid call plan ID" });
  }

  const parsed = MarkCompletedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const user = req.user!;

  try {
    const existing = await callPlannerService.getById(
      parsedId.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await callPlannerService.markCompleted(
      parsedId.data.id,
      user.companyId,
      parsed.data.notes,
      parsed.data.contactPersonId,
    );
    AnalyticsEvents.callPlanCompleted(
      req,
      updated.salesRepId,
      new Date(updated.plannedDate).toISOString(),
    );

    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Call plan not found" });
    }
    if (message === "CONTACT_NOT_FOUND_OR_MISMATCH") {
      return res.status(400).json({
        error: "Contact person not found or does not belong to customer",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
