-- CreateIndex
CREATE INDEX "audit_logs_company_id_createdAt_idx" ON "auth"."audit_logs"("company_id", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_action_idx" ON "auth"."audit_logs"("userId", "action");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "auth"."audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "users_company_id_status_idx" ON "auth"."users"("company_id", "status");

-- CreateIndex
CREATE INDEX "users_roleId_status_idx" ON "auth"."users"("roleId", "status");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_email_idx" ON "crm"."customer_contacts"("customer_id", "email");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_phone_idx" ON "crm"."customer_contacts"("customer_id", "phone");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_is_primary_idx" ON "crm"."customer_contacts"("customer_id", "is_primary");

-- CreateIndex
CREATE INDEX "customers_company_id_company_name_idx" ON "crm"."customers"("company_id", "company_name");

-- CreateIndex
CREATE INDEX "customers_sales_rep_id_created_at_idx" ON "crm"."customers"("sales_rep_id", "created_at");

-- CreateIndex (Partial Index - only active customers)
CREATE INDEX "customers_active_idx" ON "crm"."customers"("id") WHERE "deleted_at" IS NULL;

-- CreateIndex (Partial Index - active customers by company)
CREATE INDEX "customers_company_active_idx" ON "crm"."customers"("company_id", "company_name") WHERE "deleted_at" IS NULL;

-- CreateIndex (Partial Index - active customers by sales rep)
CREATE INDEX "customers_salesrep_active_idx" ON "crm"."customers"("sales_rep_id", "created_at") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "leads_customer_id_status_created_at_idx" ON "crm"."leads"("customer_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "leads_customer_id_generator_recommended_idx" ON "crm"."leads"("customer_id", "generator_recommended");

-- CreateIndex
CREATE INDEX "leads_sales_rep_id_status_idx" ON "crm"."leads"("sales_rep_id", "status");

-- CreateIndex
CREATE INDEX "quotations_lead_id_status_idx" ON "crm"."quotations"("lead_id", "status");

-- CreateIndex
CREATE INDEX "quotations_customer_id_created_at_idx" ON "crm"."quotations"("customer_id", "created_at");
