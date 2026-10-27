BEGIN;

-- Preserve existing account and contact IDs, owners, and related records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."Customer"
    WHERE "historyStatus" <> 'UNKNOWN'
       OR "historyStart" IS NOT NULL
       OR "historyEnd" IS NOT NULL
       OR "historyVerifiedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Review existing customer history before removing legacy history columns';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "public"."Opportunity"
    WHERE "routeToMarket" IS NOT NULL
      AND "routeToMarket" NOT IN ('Fields Sales', 'Other', 'Reseller', 'Telecoverage', 'Telesales')
  ) THEN
    RAISE EXCEPTION 'Review unsupported opportunity routes before converting to SalesRoute';
  END IF;
END $$;

CREATE TYPE "public"."SalesRoute" AS ENUM ('FIELDS_SALES', 'OTHER', 'RESELLER', 'TELECOVERAGE', 'TELESALES');
CREATE TYPE "public"."PredictionModelVariant" AS ENUM ('PRIMARY', 'LIMITED_HISTORY');
CREATE TYPE "public"."PredictionAssessment" AS ENUM ('REASONABLE', 'OVERESTIMATED', 'UNDERESTIMATED');

ALTER TABLE "public"."Customer" RENAME TO "Account";
ALTER TABLE "public"."CustomerContact" RENAME TO "Contact";
ALTER TABLE "public"."Account" RENAME COLUMN "companyName" TO "businessName";
ALTER TABLE "public"."Account" RENAME COLUMN "salesRepId" TO "ownerId";
ALTER TABLE "public"."Contact" RENAME COLUMN "customerId" TO "accountId";
ALTER TABLE "public"."Opportunity" RENAME COLUMN "customerId" TO "accountId";
ALTER TABLE "public"."Opportunity" RENAME COLUMN "amount" TO "estimatedAmount";
ALTER TABLE "public"."Interaction" RENAME COLUMN "customerId" TO "accountId";
ALTER TABLE "public"."Interaction" RENAME COLUMN "kind" TO "interactionType";
ALTER TABLE "public"."FollowUp" RENAME COLUMN "customerId" TO "accountId";
ALTER TABLE "public"."ProductSubgroup" RENAME COLUMN "groupId" TO "productGroupId";

ALTER TABLE "public"."Opportunity" ADD COLUMN "estimatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."Opportunity" ALTER COLUMN "routeToMarket" TYPE "public"."SalesRoute"
  USING (CASE "routeToMarket"
    WHEN 'Fields Sales' THEN 'FIELDS_SALES'
    WHEN 'Other' THEN 'OTHER'
    WHEN 'Reseller' THEN 'RESELLER'
    WHEN 'Telecoverage' THEN 'TELECOVERAGE'
    WHEN 'Telesales' THEN 'TELESALES'
    ELSE NULL
  END)::"public"."SalesRoute";

ALTER TABLE "public"."Account" DROP COLUMN "historyStatus", DROP COLUMN "historyStart", DROP COLUMN "historyEnd", DROP COLUMN "historyVerifiedAt";
DROP TYPE "public"."HistoryStatus";

ALTER TABLE "public"."Account" RENAME CONSTRAINT "Customer_pkey" TO "Account_pkey";
ALTER TABLE "public"."Account" RENAME CONSTRAINT "Customer_salesRepId_fkey" TO "Account_ownerId_fkey";
ALTER TABLE "public"."Contact" RENAME CONSTRAINT "CustomerContact_pkey" TO "Contact_pkey";
ALTER TABLE "public"."Contact" RENAME CONSTRAINT "CustomerContact_customerId_fkey" TO "Contact_accountId_fkey";
ALTER TABLE "public"."Opportunity" RENAME CONSTRAINT "Opportunity_customerId_fkey" TO "Opportunity_accountId_fkey";
ALTER TABLE "public"."Interaction" RENAME CONSTRAINT "Interaction_customerId_fkey" TO "Interaction_accountId_fkey";
ALTER TABLE "public"."FollowUp" RENAME CONSTRAINT "FollowUp_customerId_fkey" TO "FollowUp_accountId_fkey";
ALTER TABLE "public"."ProductSubgroup" RENAME CONSTRAINT "ProductSubgroup_groupId_fkey" TO "ProductSubgroup_productGroupId_fkey";

ALTER SEQUENCE "public"."Customer_id_seq" RENAME TO "Account_id_seq";
ALTER SEQUENCE "public"."CustomerContact_id_seq" RENAME TO "Contact_id_seq";
ALTER INDEX "public"."Customer_companyName_idx" RENAME TO "Account_businessName_idx";
ALTER INDEX "public"."Customer_salesRepId_deletedAt_idx" RENAME TO "Account_ownerId_deletedAt_idx";
ALTER INDEX "public"."CustomerContact_customerId_idx" RENAME TO "Contact_accountId_idx";
ALTER INDEX "public"."Opportunity_customerId_idx" RENAME TO "Opportunity_accountId_idx";
ALTER INDEX "public"."Interaction_customerId_occurredAt_idx" RENAME TO "Interaction_accountId_occurredAt_idx";
ALTER INDEX "public"."ProductSubgroup_groupId_name_key" RENAME TO "ProductSubgroup_productGroupId_name_key";

CREATE TABLE "public"."AccountRevenueSummary" (
  "id" SERIAL NOT NULL,
  "accountId" INTEGER NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "coverageStart" TIMESTAMP(3) NOT NULL,
  "coverageEnd" TIMESTAMP(3) NOT NULL,
  "evidenceSource" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "verifiedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountRevenueSummary_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountRevenueSummary_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "AccountRevenueSummary_coverage_check" CHECK ("coverageStart" < "coverageEnd" AND "coverageEnd" <= "verifiedAt")
);

CREATE TABLE "public"."OpportunityPrediction" (
  "id" SERIAL NOT NULL,
  "opportunityId" INTEGER NOT NULL,
  "revenueSummaryId" INTEGER,
  "modelVersion" TEXT NOT NULL,
  "adapterVersion" TEXT NOT NULL,
  "modelVariant" "public"."PredictionModelVariant" NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "conversionSnapshot" JSONB NOT NULL,
  "wonProbability" DECIMAL(7,6) NOT NULL,
  "explanation" JSONB,
  "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityPrediction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpportunityPrediction_probability_check" CHECK ("wonProbability" BETWEEN 0 AND 1),
  CONSTRAINT "OpportunityPrediction_history_check" CHECK (
    ("modelVariant" = 'PRIMARY' AND "revenueSummaryId" IS NOT NULL)
    OR ("modelVariant" = 'LIMITED_HISTORY' AND "revenueSummaryId" IS NULL)
  )
);

CREATE TABLE "public"."PredictionReview" (
  "id" SERIAL NOT NULL,
  "predictionId" INTEGER NOT NULL,
  "reviewerId" INTEGER NOT NULL,
  "assessment" "public"."PredictionAssessment" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PredictionReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountRevenueSummary_accountId_coverageEnd_idx" ON "public"."AccountRevenueSummary"("accountId", "coverageEnd");
CREATE INDEX "OpportunityPrediction_opportunityId_predictedAt_idx" ON "public"."OpportunityPrediction"("opportunityId", "predictedAt");
CREATE INDEX "PredictionReview_predictionId_createdAt_idx" ON "public"."PredictionReview"("predictionId", "createdAt");

ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_amount_check" CHECK ("estimatedAmount" >= 0);
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_status_check" CHECK (
  ("stage" = 'CLOSED' AND "outcome" IS NOT NULL AND "outcomeAt" IS NOT NULL)
  OR ("stage" <> 'CLOSED' AND "outcome" IS NULL AND "outcomeAt" IS NULL)
);

ALTER TABLE "public"."AccountRevenueSummary" ADD CONSTRAINT "AccountRevenueSummary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."AccountRevenueSummary" ADD CONSTRAINT "AccountRevenueSummary_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."OpportunityPrediction" ADD CONSTRAINT "OpportunityPrediction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."OpportunityPrediction" ADD CONSTRAINT "OpportunityPrediction_revenueSummaryId_fkey" FOREIGN KEY ("revenueSummaryId") REFERENCES "public"."AccountRevenueSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."PredictionReview" ADD CONSTRAINT "PredictionReview_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "public"."OpportunityPrediction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."PredictionReview" ADD CONSTRAINT "PredictionReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "public"."reject_prediction_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Predictions are immutable; append a new prediction instead';
END $$;
CREATE TRIGGER "OpportunityPrediction_immutable" BEFORE UPDATE OR DELETE ON "public"."OpportunityPrediction"
FOR EACH ROW EXECUTE FUNCTION "public"."reject_prediction_mutation"();

COMMIT;
