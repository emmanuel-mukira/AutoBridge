import type { NextFunction, Request, Response } from "express";
import { CreatePredictionReviewSchema, OpportunityIdSchema, PredictionReviewParamsSchema } from "../schemas/opportunity.schemas.js";
import { OpportunityScoringService } from "../services/opportunityScoringService.js";

const service = new OpportunityScoringService();

function scoringError(error: unknown, res: Response) {
  if (!(error instanceof Error)) return false;
  const errors: Record<string, [number, string]> = {
    OPPORTUNITY_RESOLVED: [409, "Resolved opportunities cannot be scored"],
    MISSING_ROUTE: [422, "Select a route to market before scoring"],
    MISSING_PRODUCT: [422, "Select an automotive product subgroup before scoring"],
    REVENUE_REVIEW_REQUIRED: [422, "Client revenue evidence requires review before scoring"],
    ML_NOT_CONFIGURED: [503, "Prediction service is not configured"],
    ML_UNAVAILABLE: [503, "Prediction service is unavailable. No prediction was saved"],
    ML_REJECTED_INPUT: [422, "Prediction inputs are not supported by the active model"],
    ML_INVALID_RESPONSE: [502, "Prediction service returned an invalid response. No prediction was saved"],
  };
  const mapped = errors[error.message];
  if (!mapped) return false;
  res.status(mapped[0]).json({ error: mapped[1], code: error.message });
  return true;
}

export async function score(req: Request, res: Response, next: NextFunction) {
  const id = OpportunityIdSchema.safeParse(req.params);
  if (!id.success) return void res.status(400).json({ error: "Invalid opportunity ID" });
  try {
    const prediction = await service.score(req.user!, id.data.id);
    if (!prediction) return void res.status(404).json({ error: "Opportunity not found or access denied" });
    res.status(201).json({ ...prediction, wonProbability: prediction.wonProbability.toString() });
  } catch (error) { if (!scoringError(error, res)) next(error); }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  const id = OpportunityIdSchema.safeParse(req.params);
  if (!id.success) return void res.status(400).json({ error: "Invalid opportunity ID" });
  try {
    const predictions = await service.history(req.user!, id.data.id);
    if (!predictions) return void res.status(404).json({ error: "Opportunity not found or access denied" });
    res.json(predictions);
  } catch (error) { next(error); }
}

export async function reviews(req: Request, res: Response, next: NextFunction) {
  const params = PredictionReviewParamsSchema.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: "Invalid opportunity or prediction ID" });
  try {
    const rows = await service.reviews(req.user!, params.data.id, params.data.predictionId);
    if (!rows) return void res.status(404).json({ error: "Prediction not found or access denied" });
    res.json({ reviews: rows });
  } catch (error) { next(error); }
}

export async function review(req: Request, res: Response, next: NextFunction) {
  const params = PredictionReviewParamsSchema.safeParse(req.params);
  const body = CreatePredictionReviewSchema.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: "Invalid prediction review", details: body.success ? undefined : body.error.flatten() });
  try {
    const row = await service.review(req.user!, params.data.id, params.data.predictionId, body.data);
    if (!row) return void res.status(404).json({ error: "Prediction not found or access denied" });
    res.status(201).json(row);
  } catch (error) {
    if (error instanceof Error && error.message === "REVIEW_EXISTS") return void res.status(409).json({ error: "You have already reviewed this prediction", code: "REVIEW_EXISTS" });
    next(error);
  }
}
