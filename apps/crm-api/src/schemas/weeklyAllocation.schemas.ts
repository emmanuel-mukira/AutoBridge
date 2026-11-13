import { z } from "zod";

const WeekStart = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      date.getUTCDay() === 1
    );
  }, "Use a valid Monday in UTC");

export const WeekParamsSchema = z.object({ weekStart: WeekStart });
export const OwnerQuerySchema = z.object({ ownerId: z.coerce.number().int().positive().optional() });
export const CapacitySchema = z
  .object({
    availableMinutes: z
      .number()
      .int()
      .min(0)
      .max(4800)
      .refine((value) => value % 15 === 0, "Use 15-minute increments"),
  })
  .strict();
export const RecommendationSchema = z.object({}).strict();
