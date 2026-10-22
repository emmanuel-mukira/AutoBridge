import type { NextFunction, Request, Response } from "express";
import { FollowUpService } from "../services/followUpService.js";
import { CreateFollowUpSchema, FollowUpIdSchema, ListFollowUpsSchema, UpdateFollowUpSchema } from "../schemas/followUp.schemas.js";

const service = new FollowUpService();

function referenceError(error: unknown, res: Response): boolean {
  if (!(error instanceof Error)) return false;
  const messages: Record<string, string> = {
    CLIENT_NOT_FOUND: "Client not found or access denied",
    OWNER_NOT_FOUND: "Owner not found",
    CLIENT_OWNER_MISMATCH: "Follow-up owner must own the selected client",
    OPPORTUNITY_MISMATCH: "Opportunity not found or does not belong to the selected client",
  };
  if (!messages[error.message]) return false;
  res.status(400).json({ error: messages[error.message] });
  return true;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  const parsed = CreateFollowUpSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid follow-up data", details: parsed.error.flatten().fieldErrors });
  if (req.user!.role !== "ADMIN" && parsed.data.ownerId && parsed.data.ownerId !== req.user!.id) return void res.status(403).json({ error: "Cannot assign another owner" });
  try { res.status(201).json(await service.create(req.user!, parsed.data)); } catch (error) { if (!referenceError(error, res)) next(error); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  const parsed = ListFollowUpsSchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid query parameters" });
  try { res.json(await service.list(req.user!, parsed.data)); } catch (error) { next(error); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const parsed = FollowUpIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid follow-up ID" });
  try {
    const followUp = await service.getById(req.user!, parsed.data.id);
    if (!followUp) return void res.status(404).json({ error: "Follow-up not found" });
    res.json(followUp);
  } catch (error) { next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = FollowUpIdSchema.safeParse(req.params);
  const data = UpdateFollowUpSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid follow-up data", details: data.success ? undefined : data.error.flatten().fieldErrors });
  try {
    const followUp = await service.update(req.user!, id.data.id, data.data);
    if (!followUp) return void res.status(404).json({ error: "Follow-up not found" });
    res.json(followUp);
  } catch (error) { next(error); }
}

export async function complete(req: Request, res: Response, next: NextFunction) {
  const parsed = FollowUpIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid follow-up ID" });
  try {
    const followUp = await service.complete(req.user!, parsed.data.id);
    if (!followUp) return void res.status(404).json({ error: "Follow-up not found" });
    res.json(followUp);
  } catch (error) { next(error); }
}
