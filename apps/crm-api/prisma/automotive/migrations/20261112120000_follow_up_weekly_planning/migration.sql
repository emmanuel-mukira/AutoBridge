ALTER TABLE "FollowUp" ADD COLUMN "estimatedMinutes" INTEGER;
ALTER TABLE "FollowUp" ADD COLUMN "appointmentConfirmed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_estimatedMinutes_check"
  CHECK ("estimatedMinutes" IS NULL OR ("estimatedMinutes" BETWEEN 15 AND 4800 AND "estimatedMinutes" % 15 = 0));
