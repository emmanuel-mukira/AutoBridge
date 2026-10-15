import { z } from "zod";

export const InteractionTypeEnum = z.enum([
  "CALL",
  "EMAIL",
  "MEETING",
  "SITE_VISIT",
  "FOLLOW_UP",
]);

const ContactDataSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const CreateInteractionSchema = z.object({
  customerId: z.number().int().positive(),
  salesRepId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional().nullable(),
  contact: ContactDataSchema.optional(),
  leadId: z.number().int().positive().optional().nullable(),
  quotationId: z.number().int().positive().optional().nullable(),
  type: InteractionTypeEnum.default("MEETING"),
  interactionDate: z.string().datetime().optional(),
  notes: z.string().min(1, "Notes are required"),
});

export const UpdateInteractionSchema = z.object({
  contactId: z.number().int().positive().optional().nullable(),
  leadId: z.number().int().positive().optional().nullable(),
  quotationId: z.number().int().positive().optional().nullable(),
  type: InteractionTypeEnum.optional(),
  interactionDate: z.string().datetime().optional(),
  notes: z.string().min(1).optional(),
});

export const ListInteractionsSchema = z.object({
  salesRepId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  contactId: z.coerce.number().int().positive().optional(),
  leadId: z.coerce.number().int().positive().optional(),
  quotationId: z.coerce.number().int().positive().optional(),
  type: InteractionTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const InteractionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateInteractionInput = z.infer<typeof CreateInteractionSchema>;
export type UpdateInteractionInput = z.infer<typeof UpdateInteractionSchema>;
export type ListInteractionsInput = z.infer<typeof ListInteractionsSchema>;
