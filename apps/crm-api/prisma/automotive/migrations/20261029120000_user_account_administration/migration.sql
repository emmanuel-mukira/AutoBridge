ALTER TABLE "User"
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "approvedAt" = "createdAt"
WHERE "active" = true;
