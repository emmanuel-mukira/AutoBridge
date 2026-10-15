import { z } from "zod";

export const ListAuditLogsSchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const AuditLogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ListAuditLogsInput = z.infer<typeof ListAuditLogsSchema>;
