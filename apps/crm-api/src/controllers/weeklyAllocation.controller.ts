import type { NextFunction, Request, Response } from "express";
import {
  CapacitySchema,
  OwnerQuerySchema,
  RecommendationSchema,
  WeekParamsSchema,
} from "../schemas/weeklyAllocation.schemas.js";
import { WeeklyAllocationService } from "../services/weeklyAllocationService.js";

const service = new WeeklyAllocationService();

function handle(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof Error) {
    const messages: Record<string, string> = {
      PAST_WEEK: "Choose the current or a future week",
      INVALID_OVERRIDE:
        "Duration overrides must reference eligible owned opportunities without duplicates",
      TOO_MANY_CANDIDATES:
        "Too many eligible opportunities for one planning run",
      FORBIDDEN_OWNER: "Choose an active sales representative you can access",
    };
    if (messages[error.message])
      return void res
        .status(error.message === "TOO_MANY_CANDIDATES" ? 422 : error.message === "FORBIDDEN_OWNER" ? 403 : 400)
        .json({ error: messages[error.message] });
  }
  next(error);
}

export async function getPlan(req: Request, res: Response, next: NextFunction) {
  const params = WeekParamsSchema.safeParse(req.params);
  const query = OwnerQuerySchema.safeParse(req.query);
  if (!params.success)
    return void res
      .status(400)
      .json({ error: "Week must start on Monday in UTC" });
  if (!query.success) return void res.status(400).json({ error: "Invalid sales representative" });
  try {
    res.json(await service.plan(req.user!, params.data.weekStart, query.data.ownerId));
  } catch (error) {
    handle(error, res, next);
  }
}

export async function saveCapacity(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const params = WeekParamsSchema.safeParse(req.params);
  const query = OwnerQuerySchema.safeParse(req.query);
  const body = CapacitySchema.safeParse(req.body);
  if (!params.success || !body.success || !query.success)
    return void res.status(400).json({ error: "Invalid weekly capacity" });
  try {
    res.json(
      await service.saveCapacity(
        await service.ownerId(req.user!, query.data.ownerId),
        params.data.weekStart,
        body.data.availableMinutes,
      ),
    );
  } catch (error) {
    handle(error, res, next);
  }
}

export async function recommend(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const params = WeekParamsSchema.safeParse(req.params);
  const query = OwnerQuerySchema.safeParse(req.query);
  const body = RecommendationSchema.safeParse(req.body ?? {});
  if (!params.success || !query.success || !body.success)
    return void res
      .status(400)
      .json({ error: "Invalid recommendation request" });
  try {
    res.json(
      await service.plan(
        req.user!,
        params.data.weekStart,
        query.data.ownerId,
      ),
    );
  } catch (error) {
    handle(error, res, next);
  }
}
