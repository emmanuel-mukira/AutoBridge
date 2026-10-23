ALTER TABLE "public"."Opportunity"
ADD COLUMN "confirmedAmount" DECIMAL(18,2),
ADD COLUMN "confirmedCurrency" VARCHAR(3),
ADD COLUMN "confirmedAmountUsd" DECIMAL(18,6),
ADD COLUMN "confirmedQuoteUnitsPerUsd" DECIMAL(18,6),
ADD COLUMN "confirmedRateSource" TEXT,
ADD COLUMN "confirmedRateObservedAt" TIMESTAMP(3),
ADD COLUMN "confirmedAt" TIMESTAMP(3);

ALTER TABLE "public"."Opportunity"
ADD CONSTRAINT "Opportunity_confirmed_sale_check" CHECK (
  (
    "confirmedAmount" IS NULL AND
    "confirmedCurrency" IS NULL AND
    "confirmedAmountUsd" IS NULL AND
    "confirmedQuoteUnitsPerUsd" IS NULL AND
    "confirmedRateSource" IS NULL AND
    "confirmedRateObservedAt" IS NULL AND
    "confirmedAt" IS NULL
  ) OR (
    "outcome" = 'WON' AND
    "confirmedAmount" IS NOT NULL AND "confirmedAmount" >= 0 AND
    "confirmedCurrency" IN ('KES', 'USD') AND
    "confirmedAmountUsd" IS NOT NULL AND "confirmedAmountUsd" >= 0 AND
    "confirmedQuoteUnitsPerUsd" IS NOT NULL AND "confirmedQuoteUnitsPerUsd" > 0 AND
    "confirmedRateSource" IS NOT NULL AND length(trim("confirmedRateSource")) > 0 AND
    "confirmedRateObservedAt" IS NOT NULL AND
    "confirmedAt" IS NOT NULL
  )
);

CREATE INDEX "Opportunity_clientId_outcome_outcomeAt_idx"
ON "public"."Opportunity"("clientId", "outcome", "outcomeAt");
