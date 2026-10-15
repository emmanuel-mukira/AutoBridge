import { z } from "zod";

export const CreateQuotationSchema = z.object({
  customerId: z.number().int().positive(),
  salesRepId: z.number().int().positive().optional(),
  leadId: z.number().int().positive().optional(),
  totalPrice: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "SUPERSEDED"])
    .default("DRAFT"),
});

export const UpdateQuotationSchema = z.object({
  leadId: z.number().int().positive().optional().nullable(),
  totalPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "SUPERSEDED"])
    .optional(),
});

export const ListQuotationsSchema = z.object({
  salesRepId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "SUPERSEDED"])
    .optional(),
  quoteNumber: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const QuotationIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const CreateNewVersionSchema = z.object({
  totalPrice: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;
export type ListQuotationsInput = z.infer<typeof ListQuotationsSchema>;
export type CreateNewVersionInput = z.infer<typeof CreateNewVersionSchema>;
