-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'SALES_REP');

-- CreateEnum
CREATE TYPE "public"."HistoryStatus" AS ENUM ('UNKNOWN', 'VERIFIED');

-- CreateEnum
CREATE TYPE "public"."OpportunityStage" AS ENUM ('NEW', 'QUALIFYING', 'PROPOSAL', 'NEGOTIATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."OpportunityOutcome" AS ENUM ('WON', 'LOST');

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'SALES_REP',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "countyName" TEXT NOT NULL,
    "locationAddress" TEXT NOT NULL,
    "shortHistory" TEXT,
    "salesRepId" INTEGER NOT NULL,
    "historyStatus" "public"."HistoryStatus" NOT NULL DEFAULT 'UNKNOWN',
    "historyStart" TIMESTAMP(3),
    "historyEnd" TIMESTAMP(3),
    "historyVerifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerContact" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductSubgroup" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductSubgroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Opportunity" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "productSubgroupId" INTEGER,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "routeToMarket" TEXT,
    "stage" "public"."OpportunityStage" NOT NULL DEFAULT 'NEW',
    "outcome" "public"."OpportunityOutcome",
    "outcomeAt" TIMESTAMP(3),
    "estimatedCloseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Interaction" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "opportunityId" INTEGER,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FollowUp" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "opportunityId" INTEGER,
    "ownerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_role_idx" ON "public"."User"("companyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_id_key" ON "public"."User"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "public"."Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Customer_companyId_companyName_idx" ON "public"."Customer"("companyId", "companyName");

-- CreateIndex
CREATE INDEX "Customer_companyId_salesRepId_deletedAt_idx" ON "public"."Customer"("companyId", "salesRepId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_id_key" ON "public"."Customer"("companyId", "id");

-- CreateIndex
CREATE INDEX "CustomerContact_companyId_customerId_idx" ON "public"."CustomerContact"("companyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_name_key" ON "public"."ProductGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSubgroup_groupId_name_key" ON "public"."ProductSubgroup"("groupId", "name");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_stage_outcome_idx" ON "public"."Opportunity"("companyId", "stage", "outcome");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_customerId_idx" ON "public"."Opportunity"("companyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_companyId_id_key" ON "public"."Opportunity"("companyId", "id");

-- CreateIndex
CREATE INDEX "Interaction_companyId_customerId_occurredAt_idx" ON "public"."Interaction"("companyId", "customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "FollowUp_companyId_ownerId_dueAt_idx" ON "public"."FollowUp"("companyId", "ownerId", "dueAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_companyId_salesRepId_fkey" FOREIGN KEY ("companyId", "salesRepId") REFERENCES "public"."User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerContact" ADD CONSTRAINT "CustomerContact_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "public"."Customer"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductSubgroup" ADD CONSTRAINT "ProductSubgroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."ProductGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "public"."Customer"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_companyId_ownerId_fkey" FOREIGN KEY ("companyId", "ownerId") REFERENCES "public"."User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_productSubgroupId_fkey" FOREIGN KEY ("productSubgroupId") REFERENCES "public"."ProductSubgroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "public"."Customer"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_companyId_opportunityId_fkey" FOREIGN KEY ("companyId", "opportunityId") REFERENCES "public"."Opportunity"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "public"."User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "public"."Customer"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_companyId_opportunityId_fkey" FOREIGN KEY ("companyId", "opportunityId") REFERENCES "public"."Opportunity"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_companyId_ownerId_fkey" FOREIGN KEY ("companyId", "ownerId") REFERENCES "public"."User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
