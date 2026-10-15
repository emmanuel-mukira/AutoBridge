/*
  Warnings:

  - A unique constraint covering the columns `[company_id,date]` on the table `daily_analytics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,year,month]` on the table `monthly_analytics` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "crm"."daily_analytics_company_id_sales_rep_id_date_key";

-- DropIndex
DROP INDEX "crm"."monthly_analytics_company_id_sales_rep_id_year_month_key";

-- CreateIndex
CREATE INDEX "daily_analytics_company_id_sales_rep_id_date_idx" ON "crm"."daily_analytics"("company_id", "sales_rep_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_company_date_key" ON "crm"."daily_analytics"("company_id", "date");

-- CreateIndex
CREATE INDEX "monthly_analytics_company_id_sales_rep_id_year_month_idx" ON "crm"."monthly_analytics"("company_id", "sales_rep_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_analytics_company_year_month_key" ON "crm"."monthly_analytics"("company_id", "year", "month");
