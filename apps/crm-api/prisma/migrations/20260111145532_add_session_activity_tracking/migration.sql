/*
  Warnings:

  - You are about to drop the column `createdAt` on the `user_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `lastRefreshed` on the `user_sessions` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `user_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add new columns with defaults first
ALTER TABLE "auth"."user_sessions" 
ADD COLUMN "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "last_refreshed" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Copy data from old columns to new columns
UPDATE "auth"."user_sessions" 
SET "created_at" = "createdAt",
    "last_refreshed" = "lastRefreshed",
    "last_activity" = COALESCE("lastRefreshed", "createdAt"),
    "expires_at" = COALESCE("lastRefreshed", "createdAt") + INTERVAL '7 days';

-- Drop old columns
ALTER TABLE "auth"."user_sessions" 
DROP COLUMN "createdAt",
DROP COLUMN "lastRefreshed";

-- CreateIndex
CREATE INDEX "user_sessions_userId_last_activity_idx" ON "auth"."user_sessions"("userId", "last_activity");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "auth"."user_sessions"("expires_at");
