import { z } from "zod";

export const CreateContactSchema = z.object({
  accountId: z.number().int().positive(),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

export const UpdateContactSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const ListContactsSchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ContactIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateContactInput = z.infer<
  typeof CreateContactSchema
>;
export type UpdateContactInput = z.infer<
  typeof UpdateContactSchema
>;
export type ListContactsInput = z.infer<
  typeof ListContactsSchema
>;
