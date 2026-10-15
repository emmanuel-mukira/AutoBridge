-- CreateTable
CREATE TABLE "crm"."daily_analytics" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "sales_rep_id" INTEGER,
    "total_leads" INTEGER NOT NULL DEFAULT 0,
    "draft_leads" INTEGER NOT NULL DEFAULT 0,
    "open_leads" INTEGER NOT NULL DEFAULT 0,
    "won_leads" INTEGER NOT NULL DEFAULT 0,
    "lost_leads" INTEGER NOT NULL DEFAULT 0,
    "qualified_leads" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_quotations" INTEGER NOT NULL DEFAULT 0,
    "draft_quotations" INTEGER NOT NULL DEFAULT 0,
    "sent_quotations" INTEGER NOT NULL DEFAULT 0,
    "accepted_quotations" INTEGER NOT NULL DEFAULT 0,
    "rejected_quotations" INTEGER NOT NULL DEFAULT 0,
    "total_quotation_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "accepted_quotation_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_call_plans" INTEGER NOT NULL DEFAULT 0,
    "completed_call_plans" INTEGER NOT NULL DEFAULT 0,
    "new_customers" INTEGER NOT NULL DEFAULT 0,
    "total_customers" INTEGER NOT NULL DEFAULT 0,
    "total_interactions" INTEGER NOT NULL DEFAULT 0,
    "product_line_data" JSONB,
    "regional_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."monthly_analytics" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sales_rep_id" INTEGER,
    "total_leads" INTEGER NOT NULL DEFAULT 0,
    "draft_leads" INTEGER NOT NULL DEFAULT 0,
    "open_leads" INTEGER NOT NULL DEFAULT 0,
    "won_leads" INTEGER NOT NULL DEFAULT 0,
    "lost_leads" INTEGER NOT NULL DEFAULT 0,
    "qualified_leads" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_quotations" INTEGER NOT NULL DEFAULT 0,
    "draft_quotations" INTEGER NOT NULL DEFAULT 0,
    "sent_quotations" INTEGER NOT NULL DEFAULT 0,
    "accepted_quotations" INTEGER NOT NULL DEFAULT 0,
    "rejected_quotations" INTEGER NOT NULL DEFAULT 0,
    "total_quotation_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "accepted_quotation_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_call_plans" INTEGER NOT NULL DEFAULT 0,
    "completed_call_plans" INTEGER NOT NULL DEFAULT 0,
    "new_customers" INTEGER NOT NULL DEFAULT 0,
    "total_customers" INTEGER NOT NULL DEFAULT 0,
    "total_interactions" INTEGER NOT NULL DEFAULT 0,
    "product_line_data" JSONB,
    "regional_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_analytics_company_id_date_idx" ON "crm"."daily_analytics"("company_id", "date");

-- CreateIndex
CREATE INDEX "daily_analytics_sales_rep_id_date_idx" ON "crm"."daily_analytics"("sales_rep_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_company_id_sales_rep_id_date_key" ON "crm"."daily_analytics"("company_id", "sales_rep_id", "date");

-- CreateIndex
CREATE INDEX "monthly_analytics_company_id_year_month_idx" ON "crm"."monthly_analytics"("company_id", "year", "month");

-- CreateIndex
CREATE INDEX "monthly_analytics_sales_rep_id_year_month_idx" ON "crm"."monthly_analytics"("sales_rep_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_analytics_company_id_sales_rep_id_year_month_key" ON "crm"."monthly_analytics"("company_id", "sales_rep_id", "year", "month");

-- AddForeignKey
ALTER TABLE "crm"."daily_analytics" ADD CONSTRAINT "daily_analytics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."daily_analytics" ADD CONSTRAINT "daily_analytics_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."monthly_analytics" ADD CONSTRAINT "monthly_analytics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."monthly_analytics" ADD CONSTRAINT "monthly_analytics_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
