ALTER TABLE "public"."Account" RENAME TO "Client";
ALTER TABLE "public"."AccountRevenueSummary" RENAME TO "ClientRevenueSummary";
ALTER SEQUENCE "public"."Account_id_seq" RENAME TO "Client_id_seq";
ALTER SEQUENCE "public"."AccountRevenueSummary_id_seq" RENAME TO "ClientRevenueSummary_id_seq";

ALTER TABLE "public"."Contact" RENAME COLUMN "accountId" TO "clientId";
ALTER TABLE "public"."Opportunity" RENAME COLUMN "accountId" TO "clientId";
ALTER TABLE "public"."Interaction" RENAME COLUMN "accountId" TO "clientId";
ALTER TABLE "public"."FollowUp" RENAME COLUMN "accountId" TO "clientId";
ALTER TABLE "public"."ClientRevenueSummary" RENAME COLUMN "accountId" TO "clientId";
ALTER TABLE "public"."FollowUp" ADD COLUMN "channel" TEXT;

ALTER TABLE "public"."Client" RENAME CONSTRAINT "Account_pkey" TO "Client_pkey";
ALTER TABLE "public"."Client" RENAME CONSTRAINT "Account_ownerId_fkey" TO "Client_ownerId_fkey";
ALTER TABLE "public"."ClientRevenueSummary" RENAME CONSTRAINT "AccountRevenueSummary_pkey" TO "ClientRevenueSummary_pkey";
ALTER TABLE "public"."ClientRevenueSummary" RENAME CONSTRAINT "AccountRevenueSummary_accountId_fkey" TO "ClientRevenueSummary_clientId_fkey";
ALTER TABLE "public"."ClientRevenueSummary" RENAME CONSTRAINT "AccountRevenueSummary_verifiedById_fkey" TO "ClientRevenueSummary_verifiedById_fkey";
ALTER TABLE "public"."ClientRevenueSummary" RENAME CONSTRAINT "AccountRevenueSummary_amount_check" TO "ClientRevenueSummary_amount_check";
ALTER TABLE "public"."ClientRevenueSummary" RENAME CONSTRAINT "AccountRevenueSummary_coverage_check" TO "ClientRevenueSummary_coverage_check";
ALTER TABLE "public"."Contact" RENAME CONSTRAINT "Contact_accountId_fkey" TO "Contact_clientId_fkey";
ALTER TABLE "public"."Opportunity" RENAME CONSTRAINT "Opportunity_accountId_fkey" TO "Opportunity_clientId_fkey";
ALTER TABLE "public"."Interaction" RENAME CONSTRAINT "Interaction_accountId_fkey" TO "Interaction_clientId_fkey";
ALTER TABLE "public"."FollowUp" RENAME CONSTRAINT "FollowUp_accountId_fkey" TO "FollowUp_clientId_fkey";

ALTER INDEX "public"."Account_businessName_idx" RENAME TO "Client_businessName_idx";
ALTER INDEX "public"."Account_ownerId_deletedAt_idx" RENAME TO "Client_ownerId_deletedAt_idx";
ALTER INDEX "public"."AccountRevenueSummary_accountId_coverageEnd_idx" RENAME TO "ClientRevenueSummary_clientId_coverageEnd_idx";
ALTER INDEX "public"."Contact_accountId_idx" RENAME TO "Contact_clientId_idx";
ALTER INDEX "public"."Opportunity_accountId_idx" RENAME TO "Opportunity_clientId_idx";
ALTER INDEX "public"."Interaction_accountId_occurredAt_idx" RENAME TO "Interaction_clientId_occurredAt_idx";
