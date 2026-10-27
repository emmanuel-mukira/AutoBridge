import type { NextFunction, Request, Response } from "express";
import { InteractionService } from "../services/interactionService.js";
import { CreateInteractionSchema, InteractionIdSchema, ListInteractionsSchema, UpdateInteractionSchema } from "../schemas/interaction.schemas.js";

const service = new InteractionService();

function referenceError(error: unknown, res: Response): boolean {
  if (!(error instanceof Error)) return false;
  const messages: Record<string, string> = {
    CLIENT_NOT_FOUND: "Client not found or access denied",
    OPPORTUNITY_MISMATCH: "Opportunity not found or does not belong to the selected client",
  };
  if (!messages[error.message]) return false;
  res.status(400).json({ error: messages[error.message] });
  return true;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  const parsed = CreateInteractionSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid interaction data", details: parsed.error.flatten().fieldErrors });
  try { res.status(201).json(await service.create(req.user!, parsed.data)); } catch (error) { if (!referenceError(error, res)) next(error); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  const parsed = ListInteractionsSchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid query parameters" });
  try { res.json(await service.list(req.user!, parsed.data)); } catch (error) { next(error); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const parsed = InteractionIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid interaction ID" });
  try {
    const interaction = await service.getById(req.user!, parsed.data.id);
    if (!interaction) return void res.status(404).json({ error: "Interaction not found" });
    res.json(interaction);
  } catch (error) { next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = InteractionIdSchema.safeParse(req.params);
  const data = UpdateInteractionSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid interaction data", details: data.success ? undefined : data.error.flatten().fieldErrors });
  try {
    const interaction = await service.update(req.user!, id.data.id, data.data);
    if (!interaction) return void res.status(404).json({ error: "Interaction not found or cannot be edited" });
    res.json(interaction);
  } catch (error) { if (!referenceError(error, res)) next(error); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  const parsed = InteractionIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid interaction ID" });
  try {
    if (!await service.delete(req.user!, parsed.data.id)) return void res.status(404).json({ error: "Interaction not found or cannot be deleted" });
    res.status(204).send();
  } catch (error) { next(error); }
}
