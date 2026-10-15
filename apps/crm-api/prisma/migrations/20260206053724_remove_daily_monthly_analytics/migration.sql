/*
  Warnings:

  - You are about to drop the `daily_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthly_analytics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "crm"."daily_analytics" DROP CONSTRAINT "daily_analytics_company_id_fkey";

-- DropForeignKey
ALTER TABLE "crm"."daily_analytics" DROP CONSTRAINT "daily_analytics_sales_rep_id_fkey";

-- DropForeignKey
ALTER TABLE "crm"."monthly_analytics" DROP CONSTRAINT "monthly_analytics_company_id_fkey";

-- DropForeignKey
ALTER TABLE "crm"."monthly_analytics" DROP CONSTRAINT "monthly_analytics_sales_rep_id_fkey";

-- DropTable
DROP TABLE "crm"."daily_analytics";

-- DropTable
DROP TABLE "crm"."monthly_analytics";
