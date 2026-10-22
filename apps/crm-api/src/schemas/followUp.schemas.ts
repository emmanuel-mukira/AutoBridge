import { z } from "zod";
import { InteractionTypeSchema } from "./interaction.schemas.js";

export const CreateFollowUpSchema = z.object({
  clientId: z.number().int().positive(),
  opportunityId: z.number().int().positive().nullable().optional(),
  ownerId: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(200),
  channel: InteractionTypeSchema,
  dueAt: z.string().datetime(),
});

export const UpdateFollowUpSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  channel: InteractionTypeSchema.optional(),
  dueAt: z.string().datetime().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field");

export const ListFollowUpsSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  opportunityId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  completed: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
}).refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
  message: "Start date must not be after end date",
});

export const FollowUpIdSchema = z.object({ id: z.coerce.number().int().positive() });

export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof UpdateFollowUpSchema>;
export type ListFollowUpsInput = z.infer<typeof ListFollowUpsSchema>;
