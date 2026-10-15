import { z } from "zod";

export const CreateLeadSchema = z.object({
  customerId: z.number().int().positive(),
  salesRepId: z.number().int().positive().optional(),
  generatorRecommended: z.string().optional(),
  status: z.enum(["DRAFT", "OPEN", "WON", "LOST"]).default("DRAFT"),
});

export const UpdateLeadSchema = z.object({
  generatorRecommended: z.string().optional(),
  status: z.enum(["DRAFT", "OPEN", "WON", "LOST"]).optional(),
});

export const ListLeadsSchema = z.object({
  salesRepId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  status: z.enum(["DRAFT", "OPEN", "WON", "LOST"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const LeadIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
export type ListLeadsInput = z.infer<typeof ListLeadsSchema>;
