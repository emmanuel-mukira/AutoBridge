import { z } from "zod";

export const ClientSalesHistoryQuerySchema = z.object({
  asOf: z.string().datetime().optional(),
});

export const VerifyRevenueCoverageSchema = z.object({
  declaration: z.enum(["YES", "NO", "NOT_SURE"]),
  confirmedComplete: z.boolean().optional(),
}).strict().superRefine((value, context) => {
  if (value.declaration === "YES" && value.confirmedComplete !== true) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmedComplete"], message: "Confirm that the recorded purchases are complete" });
  }
});

export type VerifyRevenueCoverageInput = z.infer<typeof VerifyRevenueCoverageSchema>;
