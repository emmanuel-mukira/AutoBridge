-- AlterTable
ALTER TABLE "crm"."interactions" ADD COLUMN     "lead_id" INTEGER,
ADD COLUMN     "quotation_id" INTEGER;

-- AlterTable
ALTER TABLE "crm"."leads" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "crm"."quotations" ADD COLUMN     "lead_id" INTEGER;

-- AddForeignKey
ALTER TABLE "crm"."interactions" ADD CONSTRAINT "interactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."interactions" ADD CONSTRAINT "interactions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "crm"."quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."quotations" ADD CONSTRAINT "quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
