import { z } from "zod";

export const CallPurposeEnum = z.enum([
  "Prospective",
  "Selling",
  "Coverage",
  "Collection",
  "Complaint",
]);

export const CallLocationTypeEnum = z.enum([
  "Customer_Office",
  "Customer_Site",
  "Hotel",
  "Dealer_Branch",
]);

export const ProductLineEnum = z.enum([
  "Parts",
  "Electrical",
  "Hardware",
  "Generator",
  "Small_Workers",
]);

export const CreateCallPlanSchema = z.object({
  salesRepId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  contactPersonId: z.number().int().positive().optional(),
  weekBeginning: z.string().datetime().or(z.date()),
  dayOfWeek: z.string().min(1),
  plannedDate: z.string().datetime().or(z.date()),
  purpose: CallPurposeEnum,
  locationType: CallLocationTypeEnum,
  exactLocation: z.string().min(1),
  productLine: ProductLineEnum,
  proposedGenerator: z.string().optional(),
});

export const UpdateCallPlanSchema = z.object({
  customerId: z.number().int().positive().optional(),
  contactPersonId: z.number().int().positive().optional().nullable(),
  weekBeginning: z.string().datetime().or(z.date()).optional(),
  dayOfWeek: z.string().min(1).optional(),
  plannedDate: z.string().datetime().or(z.date()).optional(),
  purpose: CallPurposeEnum.optional(),
  locationType: CallLocationTypeEnum.optional(),
  exactLocation: z.string().min(1).optional(),
  productLine: ProductLineEnum.optional(),
  proposedGenerator: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

export const ListCallPlansSchema = z.object({
  salesRepId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  isCompleted: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

export const CallPlanIdSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)),
});

export const MarkCompletedSchema = z.object({
  notes: z.string().optional(),
  contactPersonId: z.number().int().positive().optional().nullable(),
});

export type CreateCallPlanInput = z.infer<typeof CreateCallPlanSchema>;
export type UpdateCallPlanInput = z.infer<typeof UpdateCallPlanSchema>;
export type ListCallPlansInput = z.infer<typeof ListCallPlansSchema>;
export type CallPlanIdInput = z.infer<typeof CallPlanIdSchema>;
export type MarkCompletedInput = z.infer<typeof MarkCompletedSchema>;
