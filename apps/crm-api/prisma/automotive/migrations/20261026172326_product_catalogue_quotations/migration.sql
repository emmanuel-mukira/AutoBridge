-- CreateEnum
CREATE TYPE "public"."PurchaseHistoryDeclaration" AS ENUM ('YES', 'NO', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "public"."ProductPriceClassification" AS ENUM ('PUBLIC_RETAIL_REFERENCE', 'VERIFIED_TRADE', 'DEMONSTRATION');

-- CreateEnum
CREATE TYPE "public"."QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."QuotationTaxTreatment" AS ENUM ('VAT_INCLUSIVE', 'VAT_EXCLUSIVE', 'NOT_APPLICABLE');

-- AlterTable
ALTER TABLE "public"."ClientRevenueSummary" ADD COLUMN     "complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "declaration" "public"."PurchaseHistoryDeclaration" NOT NULL DEFAULT 'NOT_SURE';

-- Existing summaries were created only after an authorised completeness confirmation.
UPDATE "public"."ClientRevenueSummary"
SET "complete" = true,
    "declaration" = CASE WHEN "amount" = 0 THEN 'NO'::"public"."PurchaseHistoryDeclaration" ELSE 'YES'::"public"."PurchaseHistoryDeclaration" END;

ALTER TABLE "public"."ClientRevenueSummary" DROP CONSTRAINT "ClientRevenueSummary_coverage_check";
ALTER TABLE "public"."ClientRevenueSummary"
ADD CONSTRAINT "ClientRevenueSummary_coverage_check" CHECK (
  "coverageStart" < "coverageEnd" AND
  "verifiedAt" >= "coverageStart"
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" SERIAL NOT NULL,
    "productSubgroupId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "specifications" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "defaultSellingPrice" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "priceSourceName" TEXT NOT NULL,
    "priceSourceUrl" TEXT NOT NULL,
    "priceObservedAt" TIMESTAMP(3) NOT NULL,
    "priceClassification" "public"."ProductPriceClassification" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Quotation" (
    "id" SERIAL NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "contactId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "status" "public"."QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" VARCHAR(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "taxTreatment" "public"."QuotationTaxTreatment" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "taxRatePercent" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "clientNameSnapshot" TEXT NOT NULL,
    "clientAddressSnapshot" TEXT NOT NULL,
    "contactNameSnapshot" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "sentAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuotationItem" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "brandSnapshot" TEXT,
    "descriptionSnapshot" TEXT,
    "unitSnapshot" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "public"."Product"("sku");

-- CreateIndex
CREATE INDEX "Product_productSubgroupId_active_idx" ON "public"."Product"("productSubgroupId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quoteNumber_key" ON "public"."Quotation"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quotation_opportunityId_createdAt_idx" ON "public"."Quotation"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "Quotation_clientId_createdAt_idx" ON "public"."Quotation"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Quotation_createdById_status_idx" ON "public"."Quotation"("createdById", "status");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "public"."QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationItem_productId_idx" ON "public"."QuotationItem"("productId");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_productSubgroupId_fkey" FOREIGN KEY ("productSubgroupId") REFERENCES "public"."ProductSubgroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quotation" ADD CONSTRAINT "Quotation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quotation" ADD CONSTRAINT "Quotation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quotation" ADD CONSTRAINT "Quotation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuotationItem" ADD CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Commercial invariants that must hold even if a future caller bypasses the API.
ALTER TABLE "public"."Product"
ADD CONSTRAINT "Product_nonnegative_price" CHECK ("defaultSellingPrice" >= 0),
ADD CONSTRAINT "Product_kes_currency" CHECK ("currency" = 'KES');

ALTER TABLE "public"."Quotation"
ADD CONSTRAINT "Quotation_valid_dates" CHECK ("validUntil" >= "issueDate"),
ADD CONSTRAINT "Quotation_nonnegative_totals" CHECK ("subtotal" >= 0 AND "taxAmount" >= 0 AND "totalAmount" >= 0),
ADD CONSTRAINT "Quotation_valid_tax_rate" CHECK ("taxRatePercent" >= 0 AND "taxRatePercent" <= 100),
ADD CONSTRAINT "Quotation_kes_currency" CHECK ("currency" = 'KES');

ALTER TABLE "public"."QuotationItem"
ADD CONSTRAINT "QuotationItem_positive_quantity" CHECK ("quantity" > 0),
ADD CONSTRAINT "QuotationItem_nonnegative_money" CHECK ("unitPrice" >= 0 AND "lineTotal" >= 0);
