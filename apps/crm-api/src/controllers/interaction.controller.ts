import { Request, Response } from "express";
import { InteractionService } from "../services/interactionService.js";
import logger from "../lib/logger.js";
import {
  CreateInteractionSchema,
  UpdateInteractionSchema,
  ListInteractionsSchema,
  InteractionIdSchema,
} from "../schemas/interaction.schemas.js";
import { createAuditLog } from "../utils/auditLogger.js";

const interactionService = new InteractionService();

export async function create(req: Request, res: Response) {
  const parsed = CreateInteractionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid interaction data", details: parsed.error });
  }

  const user = req.user!;

  try {
    if (
      !user.groups.includes("admin") &&
      parsed.data.salesRepId &&
      parsed.data.salesRepId !== user.id
    ) {
      return res
        .status(403)
        .json({ error: "Cannot create interactions for other sales reps" });
    }
    const interaction = await interactionService.create({
      ...parsed.data,
      companyId: user.companyId,
      salesRepId: parsed.data.salesRepId || user.id,
    });

    const relatedInfo = [];
    if (interaction.leadId) relatedInfo.push(`Lead ID: ${interaction.leadId}`);
    if (interaction.quotationId)
      relatedInfo.push(`Quotation ID: ${interaction.quotationId}`);
    const related =
      relatedInfo.length > 0 ? ` (${relatedInfo.join(", ")})` : "";

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "INTERACTION_CREATED",
      description: `Logged interaction (ID: ${interaction.id}) with customer ${interaction.customer.companyName}${related}`,
      req,
    });
    return res.status(201).json(interaction);
  } catch (error) {
    logger.error({ err: error }, "interaction create failed");
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(400).json({ error: "Customer not found" });
    }
    if (message === "SALES_REP_NOT_FOUND") {
      return res.status(400).json({ error: "Sales rep not found" });
    }
    if (message === "CONTACT_NOT_FOUND_OR_MISMATCH") {
      return res
        .status(400)
        .json({ error: "Contact not found or does not belong to customer" });
    }
    if (message === "DUPLICATE_INTERACTION") {
      return res.status(409).json({
        error:
          "An identical interaction was just created. Please wait a moment before creating another.",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function list(req: Request, res: Response) {
  const parsed = ListInteractionsSchema.safeParse(req.query);
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
    const result = await interactionService.list(filters);
    return res.json(result);
  } catch (error) {
    logger.error({ err: error }, "interaction list failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getById(req: Request, res: Response) {
  const parsed = InteractionIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid interaction ID" });
  }

  const user = req.user!;

  try {
    const interaction = await interactionService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && interaction.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(interaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Interaction not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function update(req: Request, res: Response) {
  const parsedId = InteractionIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid interaction ID" });
  }

  const parsedBody = UpdateInteractionSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid update data" });
  }

  const user = req.user!;

  try {
    const existing = await interactionService.getById(
      parsedId.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await interactionService.update({
      ...parsedBody.data,
      id: parsedId.data.id,
      companyId: user.companyId,
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "INTERACTION_UPDATED",
      description: `Updated interaction (ID: ${updated.id}) with customer ${updated.customer.companyName}`,
      req,
    });

    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Interaction not found" });
    }
    if (message === "CONTACT_NOT_FOUND_OR_MISMATCH") {
      return res
        .status(400)
        .json({ error: "Contact not found or does not belong to customer" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteInteraction(req: Request, res: Response) {
  const parsed = InteractionIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid interaction ID" });
  }

  const user = req.user!;

  try {
    const existing = await interactionService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await interactionService.delete(parsed.data.id, user.companyId);

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "INTERACTION_DELETED",
      description: `Deleted interaction (ID: ${existing.id}) with customer ${existing.customer.companyName}`,
      req,
    });

    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Interaction not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getByCustomer(req: Request, res: Response) {
  const customerId = parseInt(req.params.customerId as string);
  if (isNaN(customerId)) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }

  const user = req.user!;

  try {
    const interactions = await interactionService.getByCustomer(
      customerId,
      user.companyId,
    );

    if (!user.groups.includes("admin")) {
      const hasAccess = interactions.every((i) => i.salesRepId === user.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    return res.json(interactions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
