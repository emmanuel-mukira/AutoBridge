import type { Request, Response, NextFunction } from "express";
import { ClientService } from "../services/clientService.js";
import { CreateClientSchema, UpdateClientSchema, ListClientsSchema, ClientIdSchema } from "../schemas/client.schemas.js";

const service = new ClientService();

export async function create(req: Request, res: Response, next: NextFunction) {
  const parsed = CreateClientSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid client data" });
  if (req.user!.role !== "ADMIN" && parsed.data.ownerId && parsed.data.ownerId !== req.user!.id) return void res.status(403).json({ error: "Cannot assign another salesperson" });
  try {
    const client = await service.create(req.user!, parsed.data);
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_NOT_FOUND") return void res.status(400).json({ error: "Owner not found" });
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  const parsed = ListClientsSchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid query parameters" });
  try { res.json(await service.list(req.user!, parsed.data)); } catch (error) { next(error); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const parsed = ClientIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid client ID" });
  try {
    const client = await service.getById(req.user!, parsed.data.id);
    if (!client) return void res.status(404).json({ error: "Client not found" });
    res.json(client);
  } catch (error) { next(error); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = ClientIdSchema.safeParse(req.params);
  const data = UpdateClientSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid update data" });
  if (req.user!.role !== "ADMIN" && data.data.ownerId !== undefined) return void res.status(403).json({ error: "Cannot assign another owner" });
  try {
    const client = await service.update(req.user!, id.data.id, data.data);
    if (!client) return void res.status(404).json({ error: "Client not found" });
    res.json(client);
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_NOT_FOUND") return void res.status(400).json({ error: "Owner not found" });
    if (error instanceof Error && error.message === "CLIENT_HAS_OPPORTUNITIES") return void res.status(409).json({ error: "Reassign the client only after its opportunities have been transferred" });
    next(error);
  }
}

export async function owners(req: Request, res: Response, next: NextFunction) {
  try { res.json({ owners: await service.listOwners(req.user!) }); } catch (error) { next(error); }
}

export async function deleteClient(req: Request, res: Response, next: NextFunction) {
  const parsed = ClientIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid client ID" });
  try {
    if (!(await service.delete(req.user!, parsed.data.id))) return void res.status(404).json({ error: "Client not found" });
    res.status(204).send();
  } catch (error) { next(error); }
}
