import { z } from "zod";

const CustomerCategoryEnum = z.enum([
  "SACCOS_BANKS",
  "SCHOOLS",
  "CHURCHES",
  "HOSPITALS",
  "HOTELS",
  "NGOS",
  "INDUSTRIAL",
  "DOMESTIC",
  "FARMING_DAIRY",
  "SUPERMARKETS",
  "PETROL_STATIONS",
  "APARTMENTS_COMMERCIALS",
]);

export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  countyName: z.string().min(1, "County name is required"),
  locationAddress: z.string().min(1, "Location address is required"),
  shortHistory: z.string().optional(),
  category: CustomerCategoryEnum.optional(),
  salesRepId: z.number().int().positive().optional(),
});

export const UpdateCustomerSchema = z.object({
  companyName: z.string().min(1).optional(),
  countyName: z.string().min(1).optional(),
  locationAddress: z.string().min(1).optional(),
  shortHistory: z.string().optional(),
  category: CustomerCategoryEnum.optional(),
  salesRepId: z.number().int().positive().optional().nullable(),
});

export const ListCustomersSchema = z.object({
  salesRepId: z.coerce.number().int().positive().optional(),
  countyName: z.string().optional(),
  category: CustomerCategoryEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const CustomerIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const AssignCustomerSchema = z.object({
  salesRepId: z.number().int().positive(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type ListCustomersInput = z.infer<typeof ListCustomersSchema>;
export type AssignCustomerInput = z.infer<typeof AssignCustomerSchema>;
