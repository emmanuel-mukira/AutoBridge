import type { NextFunction, Request, Response } from "express";
import { OpportunityService } from "../services/opportunityService.js";
import { CreateOpportunitySchema, ListOpportunitiesSchema, OpportunityIdSchema, TransitionOpportunitySchema, UpdateOpportunitySchema } from "../schemas/opportunity.schemas.js";

const service = new OpportunityService();

function referenceError(error: unknown, res: Response): boolean {
  if (!(error instanceof Error)) return false;
  const messages: Record<string, string> = {
    ACCOUNT_NOT_FOUND: "Account not found or access denied",
    OWNER_NOT_FOUND: "Owner not found",
    ACCOUNT_OWNER_MISMATCH: "Opportunity owner must own the selected account",
    PRODUCT_SUBGROUP_NOT_FOUND: "Product subgroup not found",
  };
  if (!messages[error.message]) return false;
  res.status(400).json({ error: messages[error.message] });
  return true;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  const parsed = CreateOpportunitySchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid opportunity data", details: parsed.error.flatten().fieldErrors });
  if (req.user!.role !== "ADMIN" && parsed.data.ownerId && parsed.data.ownerId !== req.user!.id) return void res.status(403).json({ error: "Cannot assign another owner" });
  try { res.status(201).json(await service.create(req.user!, parsed.data)); } catch (error) { if (!referenceError(error, res)) next(error); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  const parsed = ListOpportunitiesSchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid query parameters" });
  try { res.json(await service.list(req.user!, parsed.data)); } catch (error) { next(error); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const parsed = OpportunityIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid opportunity ID" });
  try {
    const opportunity = await service.getById(req.user!, parsed.data.id);
    if (!opportunity) return void res.status(404).json({ error: "Opportunity not found" });
    res.json(opportunity);
  } catch (error) { next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = OpportunityIdSchema.safeParse(req.params);
  const data = UpdateOpportunitySchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid opportunity data", details: data.success ? undefined : data.error.flatten().fieldErrors });
  if (req.user!.role !== "ADMIN" && data.data.ownerId && data.data.ownerId !== req.user!.id) return void res.status(403).json({ error: "Cannot assign another owner" });
  try {
    const opportunity = await service.update(req.user!, id.data.id, data.data);
    if (!opportunity) return void res.status(404).json({ error: "Opportunity not found" });
    res.json(opportunity);
  } catch (error) { if (!referenceError(error, res)) next(error); }
}

export async function transition(req: Request, res: Response, next: NextFunction) {
  const id = OpportunityIdSchema.safeParse(req.params);
  const data = TransitionOpportunitySchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid stage transition", details: data.success ? undefined : data.error.flatten().fieldErrors });
  try {
    const opportunity = await service.transition(req.user!, id.data.id, data.data);
    if (!opportunity) return void res.status(404).json({ error: "Opportunity not found" });
    res.json(opportunity);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STAGE_TRANSITION") return void res.status(409).json({ error: "Opportunity stages can only move forward and closed opportunities cannot reopen" });
    if (error instanceof Error && error.message === "STAGE_TRANSITION_CONFLICT") return void res.status(409).json({ error: "The opportunity changed before this update. Refresh and try again" });
    next(error);
  }
}

export async function products(req: Request, res: Response, next: NextFunction) {
  try { res.json({ productGroups: await service.listProducts() }); } catch (error) { next(error); }
}

export async function owners(req: Request, res: Response, next: NextFunction) {
  try { res.json({ owners: await service.listOwners(req.user!) }); } catch (error) { next(error); }
}
