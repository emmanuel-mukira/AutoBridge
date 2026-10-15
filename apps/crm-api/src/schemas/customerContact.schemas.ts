import { z } from "zod";

export const CreateCustomerContactSchema = z.object({
  customerId: z.number().int().positive(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

export const UpdateCustomerContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const ListCustomerContactsSchema = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const CustomerContactIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateCustomerContactInput = z.infer<
  typeof CreateCustomerContactSchema
>;
export type UpdateCustomerContactInput = z.infer<
  typeof UpdateCustomerContactSchema
>;
export type ListCustomerContactsInput = z.infer<
  typeof ListCustomerContactsSchema
>;
