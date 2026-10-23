import { z } from "zod";

export const ClientSalesHistoryQuerySchema = z.object({
  asOf: z.string().datetime().optional(),
});

export const VerifyRevenueCoverageSchema = z.object({
  coverageStart: z.string().datetime(),
  coverageEnd: z.string().datetime(),
  evidenceSource: z.string().trim().min(3).max(500),
}).superRefine((value, context) => {
  if (new Date(value.coverageStart) >= new Date(value.coverageEnd)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["coverageEnd"], message: "Coverage end must be after coverage start" });
  }
});

export type VerifyRevenueCoverageInput = z.infer<typeof VerifyRevenueCoverageSchema>;
