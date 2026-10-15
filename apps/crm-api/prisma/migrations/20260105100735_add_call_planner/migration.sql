/*
  Warnings:

  - You are about to drop the column `loginTime` on the `user_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `logoutTime` on the `user_sessions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionToken]` on the table `user_sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sales_rep_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- CreateEnum
CREATE TYPE "crm"."CallPurpose" AS ENUM ('Prospective', 'Selling', 'Coverage', 'Collection', 'Complaint');

-- CreateEnum
CREATE TYPE "crm"."CallLocationType" AS ENUM ('Customer_Office', 'Customer_Site', 'Hotel', 'Dealer_Branch');

-- CreateEnum
CREATE TYPE "crm"."ProductLine" AS ENUM ('Parts', 'Electrical', 'Hardware', 'Generator', 'Small_Workers');

-- AlterTable
ALTER TABLE "auth"."roles" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "auth"."user_sessions" DROP COLUMN "loginTime",
DROP COLUMN "logoutTime",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "lastRefreshed" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "auth"."users" ADD COLUMN     "sales_rep_code" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "crm"."customers" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "county_name" TEXT NOT NULL,
    "location_address" TEXT NOT NULL,
    "short_history" TEXT,
    "sales_rep_id" INTEGER,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contacts" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "contact_name" TEXT NOT NULL,
    "title" TEXT,
    "mobile_number" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."call_planner" (
    "id" SERIAL NOT NULL,
    "sales_rep_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "week_beginning" TIMESTAMP(3) NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "planned_date" TIMESTAMP(3) NOT NULL,
    "purpose" "crm"."CallPurpose" NOT NULL,
    "location_type" "crm"."CallLocationType" NOT NULL,
    "exact_location" TEXT NOT NULL,
    "product_line" "crm"."ProductLine" NOT NULL,
    "proposed_generator" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "call_planner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."interactions" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sales_rep_id" INTEGER NOT NULL,
    "contact_id" INTEGER,
    "interaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."leads" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sales_rep_id" INTEGER NOT NULL,
    "generator_recommended" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."quotations" (
    "id" SERIAL NOT NULL,
    "quote_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sales_rep_id" INTEGER NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quote_number_key" ON "crm"."quotations"("quote_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "auth"."user_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_sales_rep_code_key" ON "auth"."users"("sales_rep_code");

-- AddForeignKey
ALTER TABLE "crm"."customers" ADD CONSTRAINT "customers_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."call_planner" ADD CONSTRAINT "call_planner_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."call_planner" ADD CONSTRAINT "call_planner_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."interactions" ADD CONSTRAINT "interactions_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."interactions" ADD CONSTRAINT "interactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."interactions" ADD CONSTRAINT "interactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."quotations" ADD CONSTRAINT "quotations_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
