import { z } from "zod";

const MoneySchema = z.union([z.string(), z.number()]).transform(String).pipe(
  z.string().regex(/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/, "Use a non-negative amount with at most two decimal places"),
);
const NullableIdSchema = z.number().int().positive().nullable().optional();

export const CreateOpportunitySchema = z.object({
  clientId: z.number().int().positive(),
  ownerId: z.number().int().positive().optional(),
  productSubgroupId: NullableIdSchema,
  title: z.string().trim().min(1).max(200),
  estimatedAmount: MoneySchema,
  currency: z.enum(["KES", "USD"]),
  routeToMarket: z.enum(["FIELDS_SALES", "OTHER", "RESELLER", "TELECOVERAGE", "TELESALES"]).nullable().optional(),
  estimatedCloseAt: z.string().datetime().nullable().optional(),
});

export const UpdateOpportunitySchema = CreateOpportunitySchema.partial();

export const TransitionOpportunitySchema = z.object({
  stage: z.enum(["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION", "CLOSED"]),
  outcome: z.enum(["WON", "LOST"]).optional(),
  confirmedAmount: MoneySchema.optional(),
  confirmedCurrency: z.enum(["KES", "USD"]).optional(),
}).superRefine((value, context) => {
  if (value.stage === "CLOSED" && !value.outcome) context.addIssue({ code: z.ZodIssueCode.custom, path: ["outcome"], message: "Won or Lost is required when closing an opportunity" });
  if (value.stage !== "CLOSED" && value.outcome) context.addIssue({ code: z.ZodIssueCode.custom, path: ["outcome"], message: "Outcome can only be set when closing an opportunity" });
  if (value.stage === "CLOSED" && value.outcome === "WON" && (!value.confirmedAmount || !value.confirmedCurrency)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmedAmount"], message: "Confirmed amount and currency are required when an opportunity is Won" });
  }
  if (value.outcome !== "WON" && (value.confirmedAmount !== undefined || value.confirmedCurrency !== undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmedAmount"], message: "Confirmed sale value can only be recorded for a Won opportunity" });
  }
});

export const ConfirmedSaleSchema = z.object({
  confirmedAmount: MoneySchema,
  confirmedCurrency: z.enum(["KES", "USD"]),
});

export const ListOpportunitiesSchema = z.object({
  search: z.string().trim().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  productGroupId: z.coerce.number().int().positive().optional(),
  productSubgroupId: z.coerce.number().int().positive().optional(),
  stage: z.enum(["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION", "CLOSED"]).optional(),
  routeToMarket: z.enum(["FIELDS_SALES", "OTHER", "RESELLER", "TELECOVERAGE", "TELESALES"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const OpportunityIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunitySchema>;
export type TransitionOpportunityInput = z.infer<typeof TransitionOpportunitySchema>;
export type ConfirmedSaleInput = z.infer<typeof ConfirmedSaleSchema>;
export type ListOpportunitiesInput = z.infer<typeof ListOpportunitiesSchema>;
