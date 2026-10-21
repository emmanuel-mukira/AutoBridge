BEGIN;

-- DropForeignKey
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_companyId_salesRepId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CustomerContact" DROP CONSTRAINT "CustomerContact_companyId_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FollowUp" DROP CONSTRAINT "FollowUp_companyId_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FollowUp" DROP CONSTRAINT "FollowUp_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FollowUp" DROP CONSTRAINT "FollowUp_companyId_opportunityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FollowUp" DROP CONSTRAINT "FollowUp_companyId_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Interaction" DROP CONSTRAINT "Interaction_companyId_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Interaction" DROP CONSTRAINT "Interaction_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Interaction" DROP CONSTRAINT "Interaction_companyId_opportunityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Interaction" DROP CONSTRAINT "Interaction_companyId_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Opportunity" DROP CONSTRAINT "Opportunity_companyId_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Opportunity" DROP CONSTRAINT "Opportunity_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Opportunity" DROP CONSTRAINT "Opportunity_companyId_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_companyId_fkey";

-- DropIndex
DROP INDEX "public"."Customer_companyId_companyName_idx";

-- DropIndex
DROP INDEX "public"."Customer_companyId_id_key";

-- DropIndex
DROP INDEX "public"."Customer_companyId_salesRepId_deletedAt_idx";

-- DropIndex
DROP INDEX "public"."CustomerContact_companyId_customerId_idx";

-- DropIndex
DROP INDEX "public"."FollowUp_companyId_ownerId_dueAt_idx";

-- DropIndex
DROP INDEX "public"."Interaction_companyId_customerId_occurredAt_idx";

-- DropIndex
DROP INDEX "public"."Opportunity_companyId_customerId_idx";

-- DropIndex
DROP INDEX "public"."Opportunity_companyId_id_key";

-- DropIndex
DROP INDEX "public"."Opportunity_companyId_stage_outcome_idx";

-- DropIndex
DROP INDEX "public"."User_companyId_id_key";

-- DropIndex
DROP INDEX "public"."User_companyId_role_idx";

-- AlterTable
ALTER TABLE "public"."Customer" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "public"."CustomerContact" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "public"."FollowUp" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "public"."Interaction" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "public"."Opportunity" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "companyId";

-- DropTable
DROP TABLE "public"."Company";

-- CreateIndex
CREATE INDEX "Customer_companyName_idx" ON "public"."Customer"("companyName");

-- CreateIndex
CREATE INDEX "Customer_salesRepId_deletedAt_idx" ON "public"."Customer"("salesRepId", "deletedAt");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "public"."CustomerContact"("customerId");

-- CreateIndex
CREATE INDEX "FollowUp_ownerId_dueAt_idx" ON "public"."FollowUp"("ownerId", "dueAt");

-- CreateIndex
CREATE INDEX "Interaction_customerId_occurredAt_idx" ON "public"."Interaction"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "Opportunity_stage_outcome_idx" ON "public"."Opportunity"("stage", "outcome");

-- CreateIndex
CREATE INDEX "Opportunity_customerId_idx" ON "public"."Opportunity"("customerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
