import { z } from "zod";

export const CreateClientSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  countyName: z.string().trim().min(1, "County name is required"),
  locationAddress: z.string().trim().min(1, "Location address is required"),
  shortHistory: z.string().optional(),
  ownerId: z.number().int().positive().optional(),
});

export const UpdateClientSchema = z.object({
  businessName: z.string().trim().min(1).optional(),
  countyName: z.string().min(1).optional(),
  locationAddress: z.string().min(1).optional(),
  shortHistory: z.string().optional(),
  ownerId: z.number().int().positive().optional(),
});

export const ListClientsSchema = z.object({
  ownerId: z.coerce.number().int().positive().optional(),
  countyName: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ClientIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const AssignClientSchema = z.object({
  ownerId: z.number().int().positive(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type ListClientsInput = z.infer<typeof ListClientsSchema>;
export type AssignClientInput = z.infer<typeof AssignClientSchema>;
