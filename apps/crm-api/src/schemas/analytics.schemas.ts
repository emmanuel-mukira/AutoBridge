import { z } from "zod";

export const AnalyticsOverviewQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  stage: z.enum(["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION", "CLOSED"]).optional(),
  outcome: z.enum(["WON", "LOST"]).optional(),
  productGroupId: z.coerce.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (value.startDate && value.endDate && new Date(value.startDate) > new Date(value.endDate)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be on or after start date" });
  }
});

export type AnalyticsOverviewQuery = z.infer<typeof AnalyticsOverviewQuerySchema>;

export const DecisionSupportQuerySchema = z.object({
  ownerId: z.coerce.number().int().positive().optional(),
  productGroupId: z.coerce.number().int().positive().optional(),
  predictionStatus: z.enum(["CURRENT", "STALE", "UNSCORED"]).optional(),
  sort: z.enum(["WEIGHTED_VALUE", "PROBABILITY", "VALUE", "FOLLOW_UP"]).default("WEIGHTED_VALUE"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(5).max(50).default(10),
});

export type DecisionSupportQuery = z.infer<typeof DecisionSupportQuerySchema>;
