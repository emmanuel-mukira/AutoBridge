/*
  Warnings:

  - You are about to drop the column `qualified_leads` on the `daily_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `qualified_leads` on the `monthly_analytics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "crm"."daily_analytics" DROP COLUMN "qualified_leads",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "crm"."monthly_analytics" DROP COLUMN "qualified_leads";
