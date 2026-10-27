import { z } from "zod";

const QuantitySchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(
    z
      .string()
      .regex(
        /^(?!0+(\.0{1,3})?$)(0|[1-9]\d{0,8})(\.\d{1,3})?$/,
        "Use a positive quantity with at most three decimal places",
      ),
  );

const QuotationItemInputSchema = z
  .object({
    productId: z.number().int().positive(),
    quantity: QuantitySchema,
  })
  .strict();

const PercentSchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(
    z
      .string()
      .regex(
        /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/,
        "Use a percentage between 0 and 100 with at most two decimal places",
      ),
  );

const DraftFieldsSchema = z
  .object({
    contactId: z.number().int().positive().nullable().optional(),
    validUntil: z.string().datetime(),
    discountPercent: PercentSchema,
    notes: z.string().trim().max(2000).nullable().optional(),
    terms: z.string().trim().max(2000).nullable().optional(),
    items: z.array(QuotationItemInputSchema).min(1).max(50),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Each product may appear only once",
      });
  });

export const CreateQuotationSchema = DraftFieldsSchema;
export const UpdateQuotationSchema = DraftFieldsSchema;
export const QuotationIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export const OpportunityQuotationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export const QuotationStatusSchema = z
  .object({ status: z.enum(["SENT", "ACCEPTED", "REJECTED"]) })
  .strict();
export const ListQuotationsSchema = z
  .object({
    opportunityId: z.coerce.number().int().positive().optional(),
    clientId: z.coerce.number().int().positive().optional(),
    ownerId: z.coerce.number().int().positive().optional(),
    status: z
      .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "SUPERSEDED"])
      .optional(),
    search: z.string().trim().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict();

export type QuotationDraftInput = z.infer<typeof DraftFieldsSchema>;
export type ListQuotationsInput = z.infer<typeof ListQuotationsSchema>;
export type QuotationStatusInput = z.infer<typeof QuotationStatusSchema>;
