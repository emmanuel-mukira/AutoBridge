import { z } from "zod";

export const ListProductsSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    productGroupId: z.coerce.number().int().positive().optional(),
    productSubgroupId: z.coerce.number().int().positive().optional(),
    active: z.enum(["true", "false", "all"]).default("true"),
  })
  .strict();

export type ListProductsInput = z.infer<typeof ListProductsSchema>;
