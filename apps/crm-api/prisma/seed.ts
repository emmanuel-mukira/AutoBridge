#!/usr/bin/env node
/**
 * Comprehensive CRM Seed File
 *
 * Seeds 3 companies × 10 customers each with full data across all CRM tables.
 * Spreads data over 6 months for realistic analytics.
 *
 * Tables seeded: companies, users, customers, customer_contacts,
 *                leads, quotations, call_planner, interactions
 * Tables skipped: audit_logs
 *
 * NOTE: Authelia authentication is via users_database.yml (file backend).
 *       Run scripts/generate-authelia-hashes.sh BEFORE docker compose up
 *       to populate real argon2id hashes in that file.
 *
 * Usage:
 *   DATABASE_URL_ADMIN=postgresql://... pnpm --filter @tazamatech/crm-api seed
 */

import {
  CallLocationType,
  CallPurpose,
  CustomerCategory,
  InteractionType,
  PrismaClient,
  ProductLine,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL_ADMIN ||
        process.env.DATABASE_URL_OWNER ||
        process.env.DATABASE_URL,
    },
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const rand = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: readonly T[]): T => arr[rand(0, arr.length - 1)];

const daysAgo = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(rand(8, 17), rand(0, 59), 0, 0);
  return d;
};

const weekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dayName = (date: Date): string =>
  [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][date.getDay()];

// ---------------------------------------------------------------------------
// Enum pools
// ---------------------------------------------------------------------------
const CATEGORIES: readonly CustomerCategory[] = [
  "SACCOS_BANKS",
  "SCHOOLS",
  "CHURCHES",
  "HOSPITALS",
  "HOTELS",
  "NGOS",
  "INDUSTRIAL",
  "DOMESTIC",
  "FARMING_DAIRY",
  "SUPERMARKETS",
  "PETROL_STATIONS",
  "APARTMENTS_COMMERCIALS",
];
const COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Malindi",
  "Nyeri",
  "Machakos",
  "Nanyuki",
];
const PURPOSES: readonly CallPurpose[] = [
  "Prospective",
  "Selling",
  "Coverage",
  "Collection",
  "Complaint",
];
const LOCATIONS: readonly CallLocationType[] = [
  "Customer_Office",
  "Customer_Site",
  "Hotel",
  "Dealer_Branch",
];
const PRODUCTS: readonly ProductLine[] = [
  "Parts",
  "Electrical",
  "Hardware",
  "Generator",
  "Small_Workers",
];
const INTERACTION_TYPES: readonly InteractionType[] = [
  "CALL",
  "EMAIL",
  "MEETING",
  "SITE_VISIT",
  "FOLLOW_UP",
];
const LEAD_STATUSES = ["DRAFT", "OPEN", "WON", "LOST"] as const;
const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"] as const;
const GENERATORS = [
  "CAT 100kVA",
  "CAT 250kVA",
  "Perkins 150kVA",
  "Perkins 350kVA",
  "FG Wilson 200kVA",
  "FG Wilson 500kVA",
];
const FIRST_NAMES = [
  "James",
  "Sarah",
  "Peter",
  "Mary",
  "David",
  "Grace",
  "John",
  "Anne",
  "Daniel",
  "Faith",
];
const LAST_NAMES = [
  "Mwangi",
  "Kamau",
  "Ochieng",
  "Wanjiru",
  "Kipchoge",
  "Achieng",
  "Njoroge",
  "Otieno",
  "Mutua",
  "Chebet",
];
const TITLES = [
  "CEO",
  "Manager",
  "Director",
  "Supervisor",
  "Procurement Officer",
  "Operations Lead",
];
const NOTES = [
  "Discussed power requirements for new facility",
  "Followed up on previous quotation",
  "Presented generator options and pricing",
  "Site assessment for installation requirements",
  "Reviewed maintenance contract terms",
  "Addressed service complaint and scheduled repair",
  "Negotiated bulk purchase discount",
  "Demonstrated portable generator models",
  "Collected outstanding payment",
  "Scheduled follow-up for next quarter",
];

// ---------------------------------------------------------------------------
// Company definitions
// ---------------------------------------------------------------------------
interface CompanyDef {
  name: string;
  subdomain: string;
  adminCount: number;
  salesRepCount: number;
  customerNames: string[];
}

const COMPANY_DEFS: CompanyDef[] = [
  {
    name: "Alpha Company Ltd",
    subdomain: "alpha",
    adminCount: 2,
    salesRepCount: 3,
    customerNames: [
      "Nairobi Industrial Supplies",
      "Mombasa Port Services",
      "Kisumu Lakeside Hotel",
      "Nakuru Farmers Cooperative",
      "Eldoret Medical Centre",
      "Thika Manufacturing Ltd",
      "Malindi Beach Resort",
      "Nyeri Coffee Estates",
      "Machakos County School",
      "Nanyuki Safari Lodge",
    ],
  },
  {
    name: "Beta Company Ltd",
    subdomain: "beta",
    adminCount: 2,
    salesRepCount: 3,
    customerNames: [
      "Westlands Shopping Mall",
      "Kilifi Cement Works",
      "Naivasha Flower Farm",
      "Kitale Grain Millers",
      "Garissa Solar Project",
      "Lamu Heritage Hotel",
      "Embu Tea Factory",
      "Meru Dairy Cooperative",
      "Isiolo Livestock Market",
      "Kajiado Ranch Supplies",
    ],
  },
  {
    name: "Gamma Company Ltd",
    subdomain: "gamma",
    adminCount: 1,
    salesRepCount: 2,
    customerNames: [
      "Kisii Highlands Academy",
      "Bungoma Sugar Mills",
      "Kakamega Forest Lodge",
      "Migori Gold Mining Co",
      "Homa Bay Fish Processors",
      "Siaya County Hospital",
      "Vihiga Community Church",
      "Busia Border Traders",
      "Trans Nzoia Wheat Farm",
      "Kericho Tea Estates",
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function main() {
  console.log("Starting comprehensive CRM seed...\n");
  console.log("Clearing existing data...");

  // Delete in FK-safe order
  await prisma.interaction.deleteMany();
  await prisma.callPlan.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Reset sequences so IDs start from 1
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE auth.companies_id_seq RESTART WITH 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE auth.users_id_seq RESTART WITH 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE crm.customers_id_seq RESTART WITH 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE crm.customer_contacts_id_seq RESTART WITH 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE crm.leads_id_seq RESTART WITH 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE crm.quotations_id_seq RESTART WITH 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE crm.call_planner_id_seq RESTART WITH 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE crm.interactions_id_seq RESTART WITH 1`,
  );

  console.log("All tables cleared & sequences reset\n");

  // Shared bcrypt hashes — used only for invite-acceptance flow reference.
  // Authelia authentication uses argon2id hashes in users_database.yml.
  const adminHash = await bcrypt.hash("Admin#2024Secure", 10);
  const salesHash = await bcrypt.hash("Sales#2024Secure", 10);

  let totalCustomers = 0;
  let totalContacts = 0;
  let totalLeads = 0;
  let totalQuotations = 0;
  let totalCallPlans = 0;
  let totalInteractions = 0;

  for (const def of COMPANY_DEFS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Seeding: ${def.name}`);
    console.log(`${"=".repeat(60)}`);

    // 1. Company
    const company = await prisma.company.create({
      data: { name: def.name, subdomain: def.subdomain, status: "ACTIVE" },
    });

    // 2. Admin users
    console.log("  Creating admins...");
    const admins = [];
    for (let i = 0; i < def.adminCount; i++) {
      // username matches Authelia users_database.yml key exactly
      const username = `${def.subdomain}.admin${i + 1}`;
      const user = await prisma.user.create({
        data: {
          companyId: company.id,
          username,
          firstName:
            def.subdomain.charAt(0).toUpperCase() + def.subdomain.slice(1),
          lastName: `Admin${i + 1}`,
          email: `${username}@example.com`,
          phone: `+2547000${company.id}0${i + 1}00`,
          passwordHash: adminHash,
          status: "ACTIVE",
          requirePasswordReset: false,
          salesRepCode: `${def.subdomain.toUpperCase()}-ADM-${String(i + 1).padStart(3, "0")}`,
        },
      });
      admins.push(user);
    }

    // 3. Sales reps
    console.log("  Creating sales reps...");
    const salesReps = [];
    for (let i = 0; i < def.salesRepCount; i++) {
      const username = `${def.subdomain}.sr${i + 1}`;
      const user = await prisma.user.create({
        data: {
          companyId: company.id,
          username,
          firstName: pick(FIRST_NAMES),
          lastName: pick(LAST_NAMES),
          email: `${username}@example.com`,
          phone: `+2547001${company.id}${i + 1}000`,
          passwordHash: salesHash,
          status: "ACTIVE",
          requirePasswordReset: false,
          salesRepCode: `${def.subdomain.toUpperCase()}-SR-${String(i + 1).padStart(3, "0")}`,
        },
      });
      salesReps.push(user);
    }

    // 6. Customers (10 per company, spread over 6 months)
    console.log("  🏢 Creating 10 customers...");
    const customers = [];
    for (let i = 0; i < 10; i++) {
      const createdDaysAgo = 180 - i * 15 + rand(-5, 5); // spread across 6 months
      const customer = await prisma.customer.create({
        data: {
          companyId: company.id,
          companyName: def.customerNames[i],
          countyName: COUNTIES[i % COUNTIES.length],
          locationAddress: `${rand(1, 500)} ${COUNTIES[i % COUNTIES.length]} Road, ${COUNTIES[i % COUNTIES.length]}`,
          shortHistory: `Established business in ${COUNTIES[i % COUNTIES.length]} region, specializing in ${pick(CATEGORIES).toLowerCase().replace(/_/g, " ")}`,
          category: CATEGORIES[i % CATEGORIES.length],
          salesRepId: salesReps[i % salesReps.length].id,
          createdAt: daysAgo(createdDaysAgo),
        },
      });
      customers.push(customer);
    }
    totalCustomers += customers.length;

    // 7. Customer contacts (2 per customer)
    console.log("  👤 Creating customer contacts...");
    const contacts = [];
    for (const customer of customers) {
      for (let i = 0; i < 2; i++) {
        const contact = await prisma.customerContact.create({
          data: {
            customerId: customer.id,
            firstName: pick(FIRST_NAMES),
            lastName: pick(LAST_NAMES),
            title: pick(TITLES),
            email: `${pick(FIRST_NAMES).toLowerCase()}.${pick(LAST_NAMES).toLowerCase()}@${customer.companyName.toLowerCase().replace(/\s+/g, "").slice(0, 12)}.co.ke`,
            phone: `+2547${rand(10000000, 99999999)}`,
            isPrimary: i === 0,
            createdAt: customer.createdAt,
          },
        });
        contacts.push(contact);
      }
    }
    totalContacts += contacts.length;

    // 8. Leads (25 per company, spread over 5 months)
    console.log("  🎯 Creating 25 leads...");
    const leads = [];
    for (let i = 0; i < 25; i++) {
      const customer = customers[i % customers.length];
      const contact = contacts.find((c) => c.customerId === customer.id);
      const createdDaysAgo = rand(5, 150);
      const status = pick(LEAD_STATUSES);
      const createdDate = daysAgo(createdDaysAgo);
      // WON/LOST leads get updatedAt a few days after creation (simulates conversion time)
      const updatedDate =
        status === "WON" || status === "LOST"
          ? daysAgo(Math.max(1, createdDaysAgo - rand(3, 14)))
          : createdDate;

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          contactPersonId: contact?.id ?? null,
          salesRepId: customer.salesRepId!,
          generatorRecommended: pick(GENERATORS),
          status,
          createdAt: createdDate,
          updatedAt: updatedDate,
        },
      });
      leads.push(lead);
    }
    totalLeads += leads.length;

    // 9. Quotations (15 per company)
    console.log("  💰 Creating 15 quotations...");
    const quotations = [];
    for (let i = 0; i < 15; i++) {
      const lead = leads[i % leads.length];
      const customer = customers.find((c) => c.id === lead.customerId)!;
      const createdDaysAgo = rand(3, 120);

      const quotation = await prisma.quotation.create({
        data: {
          companyId: company.id,
          quoteNumber: `QT-${def.subdomain.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
          version: 1,
          customerId: customer.id,
          salesRepId: lead.salesRepId,
          leadId: lead.id,
          totalPrice: rand(200000, 8000000),
          discount: Math.random() > 0.6 ? rand(3, 15) : null,
          status: pick(QUOTE_STATUSES),
          createdAt: daysAgo(createdDaysAgo),
        },
      });
      quotations.push(quotation);
    }
    totalQuotations += quotations.length;

    // 10. Call plans (30 per company, spread over 4 months)
    console.log("  📅 Creating 30 call plans...");
    const callPlans = [];
    for (let i = 0; i < 30; i++) {
      const customer = customers[i % customers.length];
      const contact = contacts.find((c) => c.customerId === customer.id);
      const planDaysAgo = rand(3, 120);
      const plannedDate = daysAgo(planDaysAgo);
      const isCompleted = planDaysAgo > 7;

      const callPlan = await prisma.callPlan.create({
        data: {
          companyId: company.id,
          salesRepId: customer.salesRepId!,
          customerId: customer.id,
          contactPersonId: contact?.id ?? null,
          weekBeginning: weekStart(plannedDate),
          dayOfWeek: dayName(plannedDate),
          plannedDate,
          purpose: pick(PURPOSES),
          locationType: pick(LOCATIONS),
          exactLocation: `${customer.countyName} ${pick(["Office", "Site", "Branch", "Warehouse"])}`,
          productLine: pick(PRODUCTS),
          proposedGenerator: Math.random() > 0.4 ? pick(GENERATORS) : null,
          isCompleted,
          completedAt: isCompleted ? plannedDate : null,
          createdAt: daysAgo(planDaysAgo + rand(1, 5)),
        },
      });
      callPlans.push(callPlan);
    }
    totalCallPlans += callPlans.length;

    // 11. Interactions (35 per company, spread over 5 months)
    console.log("  💬 Creating 35 interactions...");
    const interactions = [];
    for (let i = 0; i < 35; i++) {
      const customer = customers[i % customers.length];
      const contact = contacts.find((c) => c.customerId === customer.id);
      const customerLeads = leads.filter((l) => l.customerId === customer.id);
      const customerQuotes = quotations.filter(
        (q) => q.customerId === customer.id,
      );
      const intDaysAgo = rand(3, 150);

      const interaction = await prisma.interaction.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          salesRepId: customer.salesRepId!,
          contactId: contact?.id ?? null,
          leadId:
            customerLeads.length > 0 && Math.random() > 0.4
              ? pick(customerLeads).id
              : null,
          quotationId:
            customerQuotes.length > 0 && Math.random() > 0.6
              ? pick(customerQuotes).id
              : null,
          type: pick(INTERACTION_TYPES),
          notes: pick(NOTES),
          interactionDate: daysAgo(intDaysAgo),
          createdAt: daysAgo(intDaysAgo),
        },
      });
      interactions.push(interaction);
    }
    totalInteractions += interactions.length;

    console.log(`  ✅ ${def.name} seeded`);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(`\n${"=".repeat(60)}`);
  console.log("SEED COMPLETE");
  console.log(`${"=".repeat(60)}`);
  console.log(`\nSummary:`);
  console.log(`   Companies:    3`);
  console.log(
    `   Users:        ${COMPANY_DEFS.reduce((s, d) => s + d.adminCount + d.salesRepCount, 0)}`,
  );
  console.log(`   Customers:    ${totalCustomers}`);
  console.log(`   Contacts:     ${totalContacts}`);
  console.log(`   Leads:        ${totalLeads}`);
  console.log(`   Quotations:   ${totalQuotations}`);
  console.log(`   Call Plans:   ${totalCallPlans}`);
  console.log(`   Interactions: ${totalInteractions}`);
  console.log(`   Date range:   ~6 months historical data`);
  console.log(
    `\nAuthelia login credentials (after running generate-authelia-hashes.sh):`,
  );
  console.log(
    `   Alpha Admin:  username=alpha.admin1  password=Admin#2024Secure`,
  );
  console.log(
    `   Beta Admin:   username=beta.admin1   password=Admin#2024Secure`,
  );
  console.log(
    `   Gamma Admin:  username=gamma.admin1  password=Admin#2024Secure`,
  );
  console.log(
    `   Alpha Sales:  username=alpha.sr1     password=Sales#2024Secure`,
  );
  console.log(
    `   Beta Sales:   username=beta.sr1      password=Sales#2024Secure`,
  );
  console.log(
    `   Gamma Sales:  username=gamma.sr1     password=Sales#2024Secure`,
  );
  console.log(
    `\nNOTE: Run scripts/generate-authelia-hashes.sh to populate users_database.yml`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
