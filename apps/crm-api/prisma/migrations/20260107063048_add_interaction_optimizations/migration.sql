-- CreateEnum
CREATE TYPE "crm"."InteractionType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'SITE_VISIT', 'FOLLOW_UP');

-- AlterTable
ALTER TABLE "crm"."customers" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "crm"."interactions" ADD COLUMN     "type" "crm"."InteractionType" NOT NULL DEFAULT 'MEETING';

-- CreateIndex
CREATE INDEX "interactions_customer_id_interaction_date_idx" ON "crm"."interactions"("customer_id", "interaction_date");

-- CreateIndex
CREATE INDEX "interactions_lead_id_interaction_date_idx" ON "crm"."interactions"("lead_id", "interaction_date");

-- CreateIndex
CREATE INDEX "interactions_sales_rep_id_interaction_date_idx" ON "crm"."interactions"("sales_rep_id", "interaction_date");
