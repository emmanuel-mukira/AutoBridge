import { z } from "zod";

export const ClientSalesHistoryQuerySchema = z.object({
  asOf: z.string().datetime().optional(),
});

export const VerifyRevenueCoverageSchema = z.object({
  confirmedComplete: z.literal(true),
}).strict();

export type VerifyRevenueCoverageInput = z.infer<typeof VerifyRevenueCoverageSchema>;
