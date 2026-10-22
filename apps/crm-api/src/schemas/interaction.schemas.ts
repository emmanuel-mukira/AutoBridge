import { z } from "zod";

export const InteractionTypeSchema = z.enum(["CALL", "EMAIL", "MEETING", "SITE_VISIT", "FOLLOW_UP"]);

export const CreateInteractionSchema = z.object({
  clientId: z.number().int().positive(),
  opportunityId: z.number().int().positive().nullable().optional(),
  interactionType: InteractionTypeSchema,
  notes: z.string().trim().max(5000).nullable().optional(),
  occurredAt: z.string().datetime(),
});

export const UpdateInteractionSchema = z.object({
  interactionType: InteractionTypeSchema.optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field");

export const ListInteractionsSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  opportunityId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  interactionType: InteractionTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
}).refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
  message: "Start date must not be after end date",
});

export const InteractionIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type CreateInteractionInput = z.infer<typeof CreateInteractionSchema>;
export type UpdateInteractionInput = z.infer<typeof UpdateInteractionSchema>;
export type ListInteractionsInput = z.infer<typeof ListInteractionsSchema>;
