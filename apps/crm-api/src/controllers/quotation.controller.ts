import { Request, Response } from "express";
import { QuotationService } from "../services/quotationService.js";
import logger from "../lib/logger.js";
import {
  CreateQuotationSchema,
  UpdateQuotationSchema,
  ListQuotationsSchema,
  QuotationIdSchema,
  CreateNewVersionSchema,
} from "../schemas/quotation.schemas.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AnalyticsEvents } from "../services/analyticsService.js";

const quotationService = new QuotationService();

export async function create(req: Request, res: Response) {
  const parsed = CreateQuotationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid quotation data", details: parsed.error });
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
      .json({ error: "Cannot create quotations for other sales reps" });
  }

  try {
    const quotation = await quotationService.create({
      ...parsed.data,
      companyId: user.companyId,
      salesRepId: parsed.data.salesRepId || user.id,
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "QUOTATION_CREATED",
      description: `Created quotation ${quotation.quoteNumber} v${quotation.version} for customer ${quotation.customer.companyName} (Status: ${quotation.status})`,
      req,
    });
    return res.status(201).json(quotation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(400).json({ error: "Customer not found" });
    }
    if (message === "SALES_REP_NOT_FOUND") {
      return res.status(400).json({ error: "Sales rep not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function list(req: Request, res: Response) {
  const parsed = ListQuotationsSchema.safeParse(req.query);
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
    const result = await quotationService.list(filters);
    return res.json(result);
  } catch (error) {
    logger.error({ err: error }, "quotation list failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getById(req: Request, res: Response) {
  const parsed = QuotationIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid quotation ID" });
  }

  const user = req.user!;

  try {
    const quotation = await quotationService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && quotation.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(quotation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Quotation not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function update(req: Request, res: Response) {
  const parsedId = QuotationIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid quotation ID" });
  }

  const parsedBody = UpdateQuotationSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid update data" });
  }

  const user = req.user!;

  try {
    const existing = await quotationService.getById(
      parsedId.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await quotationService.update({
      ...parsedBody.data,
      id: parsedId.data.id,
      companyId: user.companyId,
    });

    const statusChanged = existing.status !== updated.status;
    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: statusChanged ? "QUOTATION_STATUS_CHANGED" : "QUOTATION_UPDATED",
      description: statusChanged
        ? `Quotation ${updated.quoteNumber} v${updated.version} status changed from ${existing.status} to ${updated.status}`
        : `Updated quotation ${updated.quoteNumber} v${updated.version}`,
      req,
    });
    if (statusChanged && updated.status === "ACCEPTED") {
      AnalyticsEvents.quotationAccepted(
        req,
        updated.id,
        Number(updated.totalPrice ?? 0),
      );
    }
    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Quotation not found" });
    }
    if (message === "CANNOT_UPDATE_OLD_VERSION") {
      return res.status(400).json({
        error:
          "Cannot update old version. Only the latest version can be edited.",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteQuotation(req: Request, res: Response) {
  const parsed = QuotationIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid quotation ID" });
  }

  const user = req.user!;

  try {
    const existing = await quotationService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await quotationService.delete(parsed.data.id, user.companyId);

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "QUOTATION_DELETED",
      description: `Deleted quotation ${existing.quoteNumber} v${existing.version} (DRAFT)`,
      req,
    });
    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Quotation not found" });
    }
    if (message === "CANNOT_DELETE_NON_DRAFT") {
      return res
        .status(400)
        .json({ error: "Cannot delete non-draft quotation" });
    }
    if (message === "CANNOT_DELETE_OLD_VERSION") {
      return res.status(400).json({
        error:
          "Cannot delete old version. Only the latest version can be deleted.",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createNewVersion(req: Request, res: Response) {
  const parsedId = QuotationIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid quotation ID" });
  }

  const parsedBody = CreateNewVersionSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid version data" });
  }

  const user = req.user!;

  try {
    const existing = await quotationService.getById(
      parsedId.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const newVersion = await quotationService.createNewVersion(
      parsedId.data.id,
      parsedBody.data,
      user.companyId,
    );

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "QUOTATION_VERSION_CREATED",
      description: `Created new version ${newVersion.version} of quotation ${newVersion.quoteNumber} (superseded v${existing.version})`,
      req,
    });

    return res.status(201).json(newVersion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Quotation not found" });
    }
    if (message === "CANNOT_VERSION_OLD_VERSION") {
      return res.status(400).json({
        error:
          "Cannot create version from old version. Only the latest version can be versioned.",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getVersionHistory(req: Request, res: Response) {
  const quoteNumber = req.params.quoteNumber as string;
  if (!quoteNumber) {
    return res.status(400).json({ error: "Quote number is required" });
  }

  const user = req.user!;

  try {
    const versions = await quotationService.getVersionHistory(
      quoteNumber,
      user.companyId,
    );

    if (!user.groups.includes("admin") && versions[0]?.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(versions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Quotation not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
