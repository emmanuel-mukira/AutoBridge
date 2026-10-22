import type { NextFunction, Request, Response } from "express";
import { AnalyticsOverviewQuerySchema } from "../schemas/analytics.schemas.js";
import { AnalyticsOverviewService } from "../services/analyticsOverviewService.js";

const service = new AnalyticsOverviewService();

export async function overview(req: Request, res: Response, next: NextFunction) {
  const parsed = AnalyticsOverviewQuerySchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid analytics filters", details: parsed.error.flatten().fieldErrors });
  if (req.user!.role !== "ADMIN" && parsed.data.ownerId && parsed.data.ownerId !== req.user!.id) return void res.status(403).json({ error: "Cannot view another owner's analytics" });
  try { res.json(await service.overview(req.user!, parsed.data)); } catch (error) { next(error); }
}
