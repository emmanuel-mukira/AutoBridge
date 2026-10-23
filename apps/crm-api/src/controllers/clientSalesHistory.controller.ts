import type { NextFunction, Request, Response } from "express";
import { ClientIdSchema } from "../schemas/client.schemas.js";
import { ClientSalesHistoryQuerySchema, VerifyRevenueCoverageSchema } from "../schemas/clientSalesHistory.schemas.js";
import { ClientSalesHistoryService } from "../services/clientSalesHistoryService.js";

const service = new ClientSalesHistoryService();

export async function get(req: Request, res: Response, next: NextFunction) {
  const id = ClientIdSchema.safeParse(req.params);
  const query = ClientSalesHistoryQuerySchema.safeParse(req.query);
  if (!id.success || !query.success) return void res.status(400).json({ error: "Invalid client sales-history request" });
  try {
    const result = await service.get(req.user!, id.data.id, query.data.asOf);
    if (!result) return void res.status(404).json({ error: "Client not found or access denied" });
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_AS_OF") return void res.status(400).json({ error: "Sales history cannot be evaluated in the future" });
    next(error);
  }
}

export async function verifyCoverage(req: Request, res: Response, next: NextFunction) {
  const id = ClientIdSchema.safeParse(req.params);
  const data = VerifyRevenueCoverageSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid revenue coverage evidence", details: data.success ? undefined : data.error.flatten().fieldErrors });
  try {
    const result = await service.verifyCoverage(req.user!, id.data.id, data.data);
    if (!result) return void res.status(404).json({ error: "Client not found or access denied" });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "FUTURE_COVERAGE") return void res.status(400).json({ error: "Coverage cannot end in the future" });
    if (error instanceof Error && error.message === "INCOMPLETE_WON_SALES") return void res.status(409).json({ error: "Complete confirmed values for all Won opportunities in this period before verifying coverage" });
    next(error);
  }
}
