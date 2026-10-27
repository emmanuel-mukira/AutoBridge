CREATE UNIQUE INDEX "PredictionReview_predictionId_reviewerId_key"
ON "public"."PredictionReview"("predictionId", "reviewerId");
