import type { Request, Response, NextFunction } from "express";
import { AccountService } from "../services/accountService.js";
import { CreateAccountSchema, UpdateAccountSchema, ListAccountsSchema, AccountIdSchema } from "../schemas/account.schemas.js";

const service = new AccountService();

export async function create(req: Request, res: Response, next: NextFunction) {
  const parsed = CreateAccountSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid account data" });
  if (req.user!.role !== "ADMIN" && parsed.data.ownerId && parsed.data.ownerId !== req.user!.id) return void res.status(403).json({ error: "Cannot assign another salesperson" });
  try {
    const account = await service.create(req.user!, parsed.data);
    res.status(201).json(account);
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_NOT_FOUND") return void res.status(400).json({ error: "Owner not found" });
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  const parsed = ListAccountsSchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid query parameters" });
  try { res.json(await service.list(req.user!, parsed.data)); } catch (error) { next(error); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const parsed = AccountIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid account ID" });
  try {
    const account = await service.getById(req.user!, parsed.data.id);
    if (!account) return void res.status(404).json({ error: "Account not found" });
    res.json(account);
  } catch (error) { next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = AccountIdSchema.safeParse(req.params);
  const data = UpdateAccountSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid update data" });
  try {
    const account = await service.update(req.user!, id.data.id, data.data);
    if (!account) return void res.status(404).json({ error: "Account not found" });
    res.json(account);
  } catch (error) { next(error); }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  const parsed = AccountIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid account ID" });
  try {
    if (!(await service.delete(req.user!, parsed.data.id))) return void res.status(404).json({ error: "Account not found" });
    res.status(204).send();
  } catch (error) { next(error); }
}
