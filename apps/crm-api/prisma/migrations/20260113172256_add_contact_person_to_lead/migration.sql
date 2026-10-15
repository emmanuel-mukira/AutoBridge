-- AlterTable
ALTER TABLE "crm"."leads" ADD COLUMN     "contact_person_id" INTEGER;

-- CreateIndex
CREATE INDEX "leads_contact_person_id_idx" ON "crm"."leads"("contact_person_id");

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_contact_person_id_fkey" FOREIGN KEY ("contact_person_id") REFERENCES "crm"."customer_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
