/*
  Warnings:

  - You are about to drop the column `isCompleted` on the `call_planner` table. All the data in the column will be lost.
  - You are about to drop the `contacts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[quote_number,version]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `company_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `call_planner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `interactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `leads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `quotations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "auth"."CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');

-- DropForeignKey
ALTER TABLE "crm"."contacts" DROP CONSTRAINT "contacts_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "crm"."interactions" DROP CONSTRAINT "interactions_contact_id_fkey";

-- DropIndex
DROP INDEX "crm"."quotations_quote_number_key";

-- AlterTable
ALTER TABLE "auth"."audit_logs" ADD COLUMN     "company_id" INTEGER;

-- AlterTable
ALTER TABLE "auth"."users" ADD COLUMN     "company_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "crm"."call_planner" DROP COLUMN "isCompleted",
ADD COLUMN     "company_id" INTEGER NOT NULL,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "contact_person_id" INTEGER,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "crm"."customers" ADD COLUMN     "company_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "crm"."interactions" ADD COLUMN     "company_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "crm"."leads" ADD COLUMN     "company_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "crm"."quotations" ADD COLUMN     "company_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discount" DECIMAL(5,2),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "superseded_by" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "crm"."contacts";

-- CreateTable
CREATE TABLE "auth"."companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT,
    "status" "auth"."CompanyStatus" NOT NULL DEFAULT 'TRIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_contacts" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_subdomain_key" ON "auth"."companies"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quote_number_version_key" ON "crm"."quotations"("quote_number", "version");

-- AddForeignKey
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."call_planner" ADD CONSTRAINT "call_planner_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."call_planner" ADD CONSTRAINT "call_planner_contact_person_id_fkey" FOREIGN KEY ("contact_person_id") REFERENCES "crm"."customer_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."interactions" ADD CONSTRAINT "interactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."interactions" ADD CONSTRAINT "interactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."customer_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."quotations" ADD CONSTRAINT "quotations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "auth"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
