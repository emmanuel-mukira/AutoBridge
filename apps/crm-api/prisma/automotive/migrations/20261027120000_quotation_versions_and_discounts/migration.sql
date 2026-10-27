ALTER TYPE "public"."QuotationStatus" ADD VALUE 'SUPERSEDED';

ALTER TABLE "public"."Quotation"
ADD COLUMN "version" INTEGER,
ADD COLUMN "supersedesId" INTEGER,
ADD COLUMN "current" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "supersededAt" TIMESTAMP(3);

WITH numbered AS (
  SELECT "id", row_number() OVER (PARTITION BY "opportunityId" ORDER BY "createdAt", "id") AS version
  FROM "public"."Quotation"
)
UPDATE "public"."Quotation" quotation
SET "version" = numbered.version
FROM numbered
WHERE quotation."id" = numbered."id";

WITH effective AS (
  SELECT DISTINCT ON ("opportunityId") "id"
  FROM "public"."Quotation"
  ORDER BY "opportunityId", ("status" <> 'DRAFT') DESC, "createdAt" DESC, "id" DESC
)
UPDATE "public"."Quotation"
SET "current" = true
WHERE "id" IN (SELECT "id" FROM effective);

ALTER TABLE "public"."Quotation" DROP CONSTRAINT "Quotation_nonnegative_totals";

ALTER TABLE "public"."Quotation"
ALTER COLUMN "version" SET NOT NULL,
ALTER COLUMN "version" SET DEFAULT 1,
ALTER COLUMN "issueDate" DROP NOT NULL,
DROP COLUMN "taxTreatment",
DROP COLUMN "taxRatePercent",
DROP COLUMN "taxAmount";

DROP TYPE "public"."QuotationTaxTreatment";

CREATE UNIQUE INDEX "Quotation_opportunityId_version_key" ON "public"."Quotation"("opportunityId", "version");
DROP INDEX "public"."Quotation_quoteNumber_key";
CREATE UNIQUE INDEX "Quotation_quoteNumber_version_key" ON "public"."Quotation"("quoteNumber", "version");
CREATE UNIQUE INDEX "Quotation_supersedesId_key" ON "public"."Quotation"("supersedesId");
CREATE UNIQUE INDEX "Quotation_one_current_per_opportunity" ON "public"."Quotation"("opportunityId") WHERE "current" = true;

ALTER TABLE "public"."Quotation"
ADD CONSTRAINT "Quotation_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "public"."Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Quotation_valid_discount" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
ADD CONSTRAINT "Quotation_discount_totals" CHECK (
  "subtotal" >= 0 AND "discountAmount" >= 0 AND "discountAmount" <= "subtotal" AND
  "totalAmount" = "subtotal" - "discountAmount"
);
