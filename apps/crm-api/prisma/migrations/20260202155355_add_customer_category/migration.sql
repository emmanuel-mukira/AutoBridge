-- CreateEnum
CREATE TYPE "crm"."CustomerCategory" AS ENUM ('SACCOS_BANKS', 'SCHOOLS', 'CHURCHES', 'HOSPITALS', 'HOTELS', 'NGOS', 'INDUSTRIAL', 'DOMESTIC', 'FARMING_DAIRY', 'SUPERMARKETS', 'PETROL_STATIONS', 'APARTMENTS_COMMERCIALS');

-- AlterTable
ALTER TABLE "crm"."customers" ADD COLUMN     "category" "crm"."CustomerCategory";

-- CreateIndex
CREATE INDEX "customers_category_idx" ON "crm"."customers"("category");
