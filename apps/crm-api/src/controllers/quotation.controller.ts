import type { NextFunction, Request, Response } from "express";
import {
  ListQuotationSeriesSchema,
  ListQuotationsSchema,
  QuotationIdSchema,
  QuotationStatusSchema,
  UpdateQuotationSchema,
} from "../schemas/quotation.schemas.js";
import { QuotationService } from "../services/quotationService.js";

const service = new QuotationService();

function quotationError(error: unknown, res: Response): boolean {
  if (!(error instanceof Error)) return false;
  const errors: Record<string, { status: number; message: string }> = {
    OPPORTUNITY_NOT_FOUND: {
      status: 404,
      message: "Opportunity not found or access denied",
    },
    CONTACT_MISMATCH: {
      status: 400,
      message: "Contact must belong to the opportunity client",
    },
    PRODUCT_NOT_AVAILABLE: {
      status: 400,
      message: "Every selected product must be active and available",
    },
    INVALID_VALID_UNTIL: {
      status: 400,
      message: "Quotation validity must end in the future",
    },
    QUOTATION_IMMUTABLE: {
      status: 409,
      message: "Only draft quotations can be edited",
    },
    INVALID_QUOTATION_TRANSITION: {
      status: 409,
      message:
        "Quotation status must move from Draft to Sent, then to Accepted or Rejected",
    },
    QUOTATION_CONFLICT: {
      status: 409,
      message:
        "The quotation changed before this update. Refresh and try again",
    },
    QUOTATION_NOT_REVISABLE: {
      status: 409,
      message: "Only a sent or rejected quotation can be revised",
    },
    DRAFT_ALREADY_EXISTS: {
      status: 409,
      message: "Finish the existing draft revision before creating another",
    },
    PRINCIPAL_SUBGROUP_NOT_SELECTED: {
      status: 400,
      message:
        "The main product category must be represented by the quotation items",
    },
    UNSUPPORTED_MODEL_CATEGORY: {
      status: 400,
      message:
        "The selected main product category is not supported by the scoring model",
    },
  };
  const detail = errors[error.message];
  if (!detail) return false;
  res.status(detail.status).json({ error: detail.message });
  return true;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  const parsed = ListQuotationsSchema.safeParse(req.query);
  if (!parsed.success)
    return void res.status(400).json({ error: "Invalid quotation filters" });
  try {
    res.json({ quotations: await service.list(req.user!, parsed.data) });
  } catch (error) {
    next(error);
  }
}

export async function listSeries(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = ListQuotationSeriesSchema.safeParse(req.query);
  if (!parsed.success)
    return void res.status(400).json({ error: "Invalid quotation filters" });
  try {
    res.json(await service.listSeries(req.user!, parsed.data));
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const parsed = QuotationIdSchema.safeParse(req.params);
  if (!parsed.success)
    return void res.status(400).json({ error: "Invalid quotation ID" });
  try {
    const quotation = await service.getById(req.user!, parsed.data.id);
    if (!quotation)
      return void res
        .status(404)
        .json({ error: "Quotation not found or access denied" });
    res.json(quotation);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const params = QuotationIdSchema.safeParse(req.params);
  const data = UpdateQuotationSchema.safeParse(req.body);
  if (!params.success || !data.success)
    return void res.status(400).json({
      error: "Invalid quotation data",
      details: data.success ? undefined : data.error.flatten().fieldErrors,
    });
  try {
    const quotation = await service.update(
      req.user!,
      params.data.id,
      data.data,
    );
    if (!quotation)
      return void res
        .status(404)
        .json({ error: "Quotation not found or access denied" });
    res.json(quotation);
  } catch (error) {
    if (!quotationError(error, res)) next(error);
  }
}

export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const params = QuotationIdSchema.safeParse(req.params);
  const data = QuotationStatusSchema.safeParse(req.body);
  if (!params.success || !data.success)
    return void res.status(400).json({ error: "Invalid quotation status" });
  try {
    const quotation = await service.updateStatus(
      req.user!,
      params.data.id,
      data.data,
    );
    if (!quotation)
      return void res
        .status(404)
        .json({ error: "Quotation not found or access denied" });
    res.json(quotation);
  } catch (error) {
    if (!quotationError(error, res)) next(error);
  }
}

export async function revise(req: Request, res: Response, next: NextFunction) {
  const params = QuotationIdSchema.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: "Invalid quotation ID" });
  try {
    const quotation = await service.revise(req.user!, params.data.id);
    if (!quotation)
      return void res
        .status(404)
        .json({ error: "Quotation not found or access denied" });
    res.status(201).json(quotation);
  } catch (error) {
    if (!quotationError(error, res)) next(error);
  }
}
