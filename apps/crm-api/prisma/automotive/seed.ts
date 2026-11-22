import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { lstat, open, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { parse } from "dotenv";
import { Prisma, type Opportunity, type OpportunityPrediction } from "@prisma/client";
import { prisma } from "../../src/client.js";
import {
  convertMoneyToUsd,
  ILLUSTRATIVE_USD_KES_RATE,
} from "../../src/domain/currency.js";
import { OpportunityScoringService } from "../../src/services/opportunityScoringService.js";
import { OpportunityService } from "../../src/services/opportunityService.js";
import { WeeklyAllocationService } from "../../src/services/weeklyAllocationService.js";
import { optimizeWeekly } from "../../src/services/weeklyOptimization.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const developmentPassword = process.env.ADMIN_PASSWORD;
const firstName = process.env.ADMIN_FIRST_NAME?.trim();
const lastName = process.env.ADMIN_LAST_NAME?.trim();
const databaseUrl = process.env.DATABASE_URL_ADMIN;

const mode = process.argv[2] ?? "development";
if (!["development", "production", "demo", "verify"].includes(mode))
  throw new Error("Usage: seed.ts [development|production|demo|verify]");
if (!databaseUrl) throw new Error("DATABASE_URL_ADMIN is required");
const target = new URL(databaseUrl);
const local = ["localhost", "127.0.0.1"].includes(target.hostname);
const databaseName = decodeURIComponent(target.pathname.slice(1));
if (mode === "development" && (process.env.NODE_ENV !== "development" || !local))
  throw new Error("Development seed requires NODE_ENV=development and local PostgreSQL");
if (mode !== "development" && mode !== "verify" && process.env.SEED_CONFIRM_DATABASE !== databaseName)
  throw new Error("Set SEED_CONFIRM_DATABASE to the exact target database name before initialization");
if (mode === "demo" && !local && process.env.SEED_CONFIRM_REMOTE_DEMO !== target.hostname)
  throw new Error("Set SEED_CONFIRM_REMOTE_DEMO to the exact remote database hostname for demonstration data");
if (
  !email ||
  !/^\S+@\S+\.\S+$/.test(email) ||
  (mode === "development" && (!developmentPassword || developmentPassword.length < 6)) ||
  !firstName ||
  !lastName
) {
  throw new Error(
    "Set ADMIN_EMAIL, ADMIN_FIRST_NAME, ADMIN_LAST_NAME and, for development, ADMIN_PASSWORD (6+ characters)",
  );
}

const clients = [
  {
    businessName: "Metro Auto Parts",
    countyName: "Nairobi",
    locationAddress: "Industrial Area",
    shortHistory: "Supplies parts to local garages.",
  },
  {
    businessName: "Coast Fleet Services",
    countyName: "Mombasa",
    locationAddress: "Changamwe",
    shortHistory: "Maintains commercial vehicles.",
  },
  {
    businessName: "Rift Valley Garage",
    countyName: "Nakuru",
    locationAddress: "Nakuru town",
    shortHistory: "Repairs passenger and fleet vehicles.",
  },
  {
    businessName: "Lakeside Motors",
    countyName: "Kisumu",
    locationAddress: "Mamboleo",
    shortHistory: "Services passenger vehicles and regional fleets.",
  },
  {
    businessName: "Eastern Auto Distributors",
    countyName: "Machakos",
    locationAddress: "Mlolongo",
    shortHistory: "Distributes replacement parts to independent garages.",
  },
  {
    businessName: "Savannah Fleet Logistics",
    countyName: "Nairobi",
    locationAddress: "Embakasi",
    shortHistory: "Operates a mixed commercial vehicle fleet.",
  },
  {
    businessName: "Highland Fleet Workshop",
    countyName: "Nyeri",
    locationAddress: "Kamakwa",
    shortHistory:
      "Maintains regional commercial fleets.",
  },
];

const productGroups: Record<string, string[]> = {
  "Car Accessories": [
    "Batteries & Accessories",
    "Exterior Accessories",
    "Garage & Car Care",
    "Interior Accessories",
    "Replacement Parts",
    "Towing & Hitches",
  ],
  "Car Electronics": ["Car Electronics"],
  "Performance & Non-auto": ["Motorcycle Parts", "Shelters & RV"],
  "Tires & Wheels": ["Tires & Wheels"],
};

const observedAt = new Date("2026-10-27T00:00:00.000Z");
const catalogueProducts = [
  {
    sku: "AB-BAT-001",
    subgroup: "Batteries & Accessories",
    name: "Amaron 95D31L/N70L maintenance-free battery",
    brand: "Amaron",
    unit: "Piece",
    price: "18750",
    source: "SasaParts",
    url: "https://sasaparts.com/",
  },
  {
    sku: "AB-BAT-002",
    subgroup: "Batteries & Accessories",
    name: "Chloride MF-NS60L battery",
    brand: "Chloride",
    unit: "Piece",
    price: "8150",
    source: "SasaParts",
    url: "https://sasaparts.com/",
  },
  {
    sku: "AB-BAT-003",
    subgroup: "Batteries & Accessories",
    name: "Yuasa N90L 90Ah 105D31L battery",
    brand: "Yuasa",
    unit: "Piece",
    price: "21720",
    source: "Tyrex Kenya",
    url: "https://www.tyrexkenya.co.ke/batteries",
  },
  {
    sku: "AB-BAT-004",
    subgroup: "Batteries & Accessories",
    name: "Vetsu NS60L battery",
    brand: "Vetsu",
    unit: "Piece",
    price: "8145",
    source: "Tyrex Kenya",
    url: "https://www.tyrexkenya.co.ke/batteries",
  },
  {
    sku: "AB-RPL-001",
    subgroup: "Replacement Parts",
    name: "Denso K16R-U11 spark plug",
    brand: "Denso",
    unit: "Piece",
    price: "420",
    source: "SasaParts",
    url: "https://sasaparts.com/",
  },
  {
    sku: "AB-RPL-002",
    subgroup: "Replacement Parts",
    name: "SO.HQ 42450-52080 rear hub and bearing assembly",
    brand: "SO.HQ",
    unit: "Supplier unit not confirmed",
    price: "7350",
    source: "SasaParts",
    url: "https://sasaparts.com/",
    active: false,
  },
  {
    sku: "AB-RPL-003",
    subgroup: "Replacement Parts",
    name: "Intima CD4055M D-Max front brake pads",
    brand: "Intima",
    unit: "Supplier unit not confirmed",
    price: "2625",
    source: "SasaParts catalogue",
    url: "https://sasaparts.com/product/page/1795/",
    active: false,
  },
  {
    sku: "AB-RPL-004",
    subgroup: "Replacement Parts",
    name: "Brembo 09A9661X VDJ-200 front brake disc",
    brand: "Brembo",
    unit: "Piece",
    price: "17500",
    source: "SasaParts catalogue",
    url: "https://sasaparts.com/product/page/1795/",
  },
  {
    sku: "AB-RPL-005",
    subgroup: "Replacement Parts",
    name: "Decose 04152-37010 Passo oil filter",
    brand: "Decose",
    unit: "Piece",
    price: "210",
    source: "SasaParts catalogue",
    url: "https://sasaparts.com/product/page/1795/",
  },
  {
    sku: "AB-RPL-006",
    subgroup: "Replacement Parts",
    name: "Decose 23390-0L041 Vigo fuel filter",
    brand: "Decose",
    unit: "Piece",
    price: "403",
    source: "SasaParts catalogue",
    url: "https://sasaparts.com/product/page/1795/",
  },
  {
    sku: "AB-RPL-007",
    subgroup: "Replacement Parts",
    name: "JS A2805 CR-V air filter",
    brand: "JS",
    unit: "Piece",
    price: "1050",
    source: "SasaParts catalogue",
    url: "https://sasaparts.com/product/page/1795/",
  },
  {
    sku: "AB-GCC-001",
    subgroup: "Garage & Car Care",
    name: "Motul 6100 SYN-NERGY 5W-40 5L",
    brand: "Motul",
    unit: "5L container",
    price: "6350",
    source: "DriveRight",
    url: "https://driveright.co.ke/lubricants/engine-oils",
  },
  {
    sku: "AB-GCC-002",
    subgroup: "Garage & Car Care",
    name: "Volkswagen G13 genuine coolant 1.5L",
    brand: "Volkswagen",
    unit: "1.5L container",
    price: "3360",
    source: "DriveRight",
    url: "https://driveright.co.ke/lubricants",
  },
  {
    sku: "AB-GCC-003",
    subgroup: "Garage & Car Care",
    name: "Texen AdBlue DEF 5L",
    brand: "Texen",
    unit: "5L container",
    price: "2000",
    source: "DriveRight",
    url: "https://driveright.co.ke/lubricants",
  },
  {
    sku: "AB-GCC-004",
    subgroup: "Garage & Car Care",
    name: "Multipurpose foam cleaner 100ml",
    unit: "100ml container",
    price: "250",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-INT-001",
    subgroup: "Interior Accessories",
    name: "Branded rubber floor mats",
    unit: "Set",
    price: "2600",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-INT-002",
    subgroup: "Interior Accessories",
    name: "Fabric and leather car seat covers",
    unit: "Set",
    price: "5200",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-INT-003",
    subgroup: "Interior Accessories",
    name: "Heavy-duty boot organizer",
    unit: "Piece",
    price: "3000",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-EXT-001",
    subgroup: "Exterior Accessories",
    name: "Medium outdoor waterproof car cover",
    unit: "Piece",
    price: "4999",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-EXT-002",
    subgroup: "Exterior Accessories",
    name: "Two-piece bumper protection strip",
    unit: "Set",
    price: "500",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-TOW-001",
    subgroup: "Towing & Hitches",
    name: "Nylon three-ton towing rope",
    unit: "Piece",
    price: "700",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-CEL-001",
    subgroup: "Car Electronics",
    name: "70mai A200 front dash camera",
    brand: "70mai",
    unit: "Piece",
    price: "11200",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-CEL-002",
    subgroup: "Car Electronics",
    name: "Oraimo Highway 15 car charger",
    brand: "Oraimo",
    unit: "Piece",
    price: "400",
    source: "Skywave",
    url: "https://skywave.co.ke/car-accessories-prices-in-kenya/",
  },
  {
    sku: "AB-TYR-001",
    subgroup: "Tires & Wheels",
    name: "Falken 225/55R19 99W FK520L tyre",
    brand: "Falken",
    unit: "Piece",
    price: "32130",
    source: "DriveRight",
    url: "https://driveright.co.ke/",
  },
  {
    sku: "AB-TYR-002",
    subgroup: "Tires & Wheels",
    name: "General Tire 235/60R18 Grabber AT3",
    brand: "General Tire",
    unit: "Piece",
    price: "45000",
    source: "Tiresoko",
    url: "https://tiresoko.co.ke/",
  },
  {
    sku: "AB-MCY-001",
    subgroup: "Motorcycle Parts",
    name: "Bajaj BM100 chain and sprocket kit, 428 chain, 114 links, 14T/36T",
    brand: "Bajaj",
    unit: "Kit",
    price: "3500",
    source: "Dajas Enterprises",
    url: "https://dajas.co.ke/product/chain-sprocket-bm-100",
  },
  {
    sku: "AB-MCY-002",
    subgroup: "Motorcycle Parts",
    name: "TVS chain sprocket, supplier SKU GMK13068",
    brand: "TVS",
    unit: "Piece",
    price: "2616",
    source: "Guru Motorcycles Kenya",
    url: "https://www.gurumotorcycles.co.ke/",
  },
  {
    sku: "AB-SRV-001",
    subgroup: "Shelters & RV",
    name: "Quechua multi-purpose camping tarp shelter, size L, Fresh",
    brand: "Quechua",
    unit: "Piece",
    price: "10900",
    source: "Decathlon Kenya",
    url: "https://www.decathlon.co.ke/p/366904-61231-multi-purpose-camping-tarp-shelter-size-l-fresh.html",
  },
  {
    sku: "AB-SRV-002",
    subgroup: "Shelters & RV",
    name: "Quechua 2-person pop-up camping and beach shelter, 2 Seconds 2P Fresh",
    brand: "Quechua",
    unit: "Piece",
    price: "8950",
    source: "Decathlon Kenya",
    url: "https://www.decathlon.co.ke/20191-shelters-tarps",
  },
] as const;

async function seedBase(db: Prisma.TransactionClient, passwords: [string, string, string], essentialsOnly: boolean) {
  const password = passwords[0];
  let admin = await db.user.findUnique({ where: { email } });
  if (!admin) {
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      take: 2,
    });
    if (
      admins.length > 1 ||
      (admins.length === 0 && (await db.user.count()) > 0)
    ) {
      throw new Error(
        "Cannot identify a unique development administrator; seed stopped without changing users",
      );
    }
    admin =
      admins[0] ??
      (await db.user.create({
        data: {
          email: email!,
          firstName: firstName!,
          lastName: lastName!,
          passwordHash: await bcrypt.hash(password, 12),
          mustChangePassword: mode !== "development",
          role: "ADMIN",
          approvedAt: new Date(),
        },
      }));
  }
  if (admin.role !== "ADMIN")
    throw new Error("ADMIN_EMAIL belongs to a non-admin user");
  const passwordChanged = mode === "development" && !(await bcrypt.compare(password, admin.passwordHash));
  if (
    admin.email !== email ||
    admin.firstName !== firstName ||
    admin.lastName !== lastName ||
    passwordChanged ||
    !admin.active
  ) {
    admin = await db.user.update({
      where: { id: admin.id },
      data: {
        email,
        firstName,
        lastName,
        active: true,
        approvedAt: admin.approvedAt ?? new Date(),
        ...(mode === "development" ? { mustChangePassword: false } : {}),
        ...(passwordChanged
          ? { passwordHash: await bcrypt.hash(password, 12) }
          : {}),
        ...(passwordChanged
          ? {
              sessions: {
                updateMany: {
                  where: { revokedAt: null },
                  data: { revokedAt: new Date() },
                },
              },
            }
          : {}),
      },
    });
  }

  async function ensureSalesRep(targetEmail: string, legacyEmails: string[], repFirstName: string, repLastName: string, repPassword: string) {
    const existing = await db.user.findFirst({ where: { email: { in: [targetEmail, ...legacyEmails] } } });
    if (existing && existing.role !== "SALES_REP") throw new Error(`${targetEmail} belongs to a non-sales user`);
    if (!existing) return db.user.create({ data: { email: targetEmail, firstName: repFirstName, lastName: repLastName, passwordHash: await bcrypt.hash(repPassword, 12), role: "SALES_REP", approvedAt: new Date(), mustChangePassword: mode !== "development" } });
    const passwordChanged = mode === "development" && !(await bcrypt.compare(repPassword, existing.passwordHash));
    return db.user.update({
      where: { id: existing.id },
      data: {
        email: targetEmail,
        firstName: repFirstName,
        lastName: repLastName,
        active: true,
        approvedAt: existing.approvedAt ?? new Date(),
        ...(mode === "development" ? { mustChangePassword: false } : {}),
        ...(passwordChanged ? { passwordHash: await bcrypt.hash(repPassword, 12), sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } } } : {}),
      },
    });
  }
  const firstRep = await ensureSalesRep("samuel@autobridge.com", ["samuel@autobridge.local", "samuel.sales@autobridge.test"], "Samuel", "Kamau", passwords[1]);
  const secondRep = await ensureSalesRep("grace@autobridge.com", ["grace@autobridge.local", "grace.sales@autobridge.test"], "Grace", "Achieng", passwords[2]);

  if (!essentialsOnly) for (const [index, client] of clients.entries()) {
    const ownerId = index % 2 === 0 ? firstRep.id : secondRep.id;
    const exists = await db.client.findFirst({
      where: { businessName: client.businessName },
    });
    if (exists)
      await db.client.update({
        where: { id: exists.id },
        data: { ownerId },
      });
    else await db.client.create({ data: { ...client, ownerId } });
  }
  for (const [name, subgroups] of Object.entries(productGroups)) {
    const group = await db.productGroup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    for (const subgroupName of subgroups) {
      await db.productSubgroup.upsert({
        where: {
          productGroupId_name: { productGroupId: group.id, name: subgroupName },
        },
        update: {},
        create: { productGroupId: group.id, name: subgroupName },
      });
    }
  }

  const seededClients = new Map(
    (
      await db.client.findMany({
        where: {
          businessName: { in: clients.map((client) => client.businessName) },
        },
      })
    ).map((client) => [client.businessName, client]),
  );
  const subgroupByName = new Map(
    (await db.productSubgroup.findMany()).map((subgroup) => [
      subgroup.name,
      subgroup,
    ]),
  );

  for (const product of catalogueProducts) {
    await db.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        productSubgroupId: subgroupByName.get(product.subgroup)!.id,
        sku: product.sku,
        name: product.name,
        brand: "brand" in product ? product.brand : null,
        specifications: product.name,
        unitOfMeasure: product.unit,
        defaultSellingPrice: product.price,
        currency: "KES",
        priceSourceName: product.source,
        priceSourceUrl: product.url,
        priceObservedAt: observedAt,
        priceClassification: "PUBLIC_RETAIL_REFERENCE",
        active: "active" in product ? product.active : true,
      },
    });
  }

  if (essentialsOnly) return;

  const contactData = [
    {
      client: "Metro Auto Parts",
      firstName: "James",
      lastName: "Mwangi",
      title: "Procurement Manager",
      email: "james.mwangi@example.test",
      phone: "+254700100101",
      isPrimary: true,
    },
    {
      client: "Coast Fleet Services",
      firstName: "Amina",
      lastName: "Hassan",
      title: "Fleet Manager",
      email: "amina.hassan@example.test",
      phone: "+254700100102",
      isPrimary: true,
    },
    {
      client: "Lakeside Motors",
      firstName: "Brian",
      lastName: "Otieno",
      title: "Workshop Manager",
      email: "brian.otieno@example.test",
      phone: "+254700100103",
      isPrimary: true,
    },
    {
      client: "Eastern Auto Distributors",
      firstName: "Faith",
      lastName: "Mutiso",
      title: "Purchasing Lead",
      email: "faith.mutiso@example.test",
      phone: "+254700100104",
      isPrimary: true,
    },
    {
      client: "Savannah Fleet Logistics",
      firstName: "Peter",
      lastName: "Kariuki",
      title: "Operations Manager",
      email: "peter.kariuki@example.test",
      phone: "+254700100105",
      isPrimary: true,
    },
    {
      client: "Highland Fleet Workshop",
      firstName: "Lucy",
      lastName: "Wanjiru",
      title: "Workshop Director",
      email: "lucy.wanjiru@example.test",
      phone: "+254700100106",
      isPrimary: true,
    },
  ];
  for (const contact of contactData) {
    const client = seededClients.get(contact.client)!;
    const exists = await db.contact.findFirst({
      where: { clientId: client.id, email: contact.email },
    });
    if (!exists)
      await db.contact.create({
        data: {
          clientId: client.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          isPrimary: contact.isPrimary,
        },
      });
  }

  const opportunityData = [
    {
      client: "Metro Auto Parts",
      subgroup: "Replacement Parts",
      title: "Quarterly replacement parts order",
      estimatedAmount: "480000.00",
      routeToMarket: "RESELLER" as const,
      stage: "QUALIFYING" as const,
      estimatedCloseAt: new Date("2026-11-14T09:00:00.000Z"),
    },
    {
      client: "Coast Fleet Services",
      subgroup: "Batteries & Accessories",
      title: "Fleet battery replacement",
      estimatedAmount: "1250000.00",
      routeToMarket: "FIELDS_SALES" as const,
      stage: "PROPOSAL" as const,
      estimatedCloseAt: new Date("2026-11-28T09:00:00.000Z"),
    },
    {
      client: "Rift Valley Garage",
      subgroup: "Garage & Car Care",
      title: "Workshop care supplies",
      estimatedAmount: "320000.00",
      routeToMarket: "RESELLER" as const,
      stage: "NEW" as const,
      estimatedCloseAt: new Date("2026-12-05T09:00:00.000Z"),
    },
    {
      client: "Savannah Fleet Logistics",
      subgroup: "Tires & Wheels",
      title: "Commercial fleet tyre programme",
      estimatedAmount: "2100000.00",
      routeToMarket: "FIELDS_SALES" as const,
      stage: "NEGOTIATION" as const,
      estimatedCloseAt: new Date("2026-11-07T09:00:00.000Z"),
    },
    {
      client: "Eastern Auto Distributors",
      subgroup: "Car Electronics",
      title: "Dealer dash camera restock",
      estimatedAmount: "488000.00",
      routeToMarket: "RESELLER" as const,
      stage: "NEW" as const,
      estimatedCloseAt: new Date("2026-12-08T09:00:00.000Z"),
    },
    {
      client: "Lakeside Motors",
      subgroup: "Interior Accessories",
      title: "Workshop interior accessories order",
      estimatedAmount: "157400.00",
      routeToMarket: "TELESALES" as const,
      stage: "QUALIFYING" as const,
      estimatedCloseAt: new Date("2026-11-24T09:00:00.000Z"),
    },
    {
      client: "Highland Fleet Workshop",
      subgroup: "Motorcycle Parts",
      title: "Motorcycle drivetrain spares order",
      estimatedAmount: "559280.00",
      routeToMarket: "FIELDS_SALES" as const,
      stage: "PROPOSAL" as const,
      estimatedCloseAt: new Date("2026-11-18T09:00:00.000Z"),
    },
    {
      client: "Coast Fleet Services",
      subgroup: "Shelters & RV",
      title: "Field service shelter equipment",
      estimatedAmount: "212072.00",
      routeToMarket: "FIELDS_SALES" as const,
      stage: "NEGOTIATION" as const,
      estimatedCloseAt: new Date("2026-11-10T09:00:00.000Z"),
    },
    {
      client: "Metro Auto Parts",
      subgroup: "Tires & Wheels",
      title: "Retail tyre replenishment",
      estimatedAmount: "745560.00",
      routeToMarket: "RESELLER" as const,
      stage: "NEW" as const,
      estimatedCloseAt: new Date("2026-12-12T09:00:00.000Z"),
    },
    {
      client: "Rift Valley Garage",
      subgroup: "Batteries & Accessories",
      title: "Garage battery inventory",
      estimatedAmount: "309750.00",
      routeToMarket: "TELECOVERAGE" as const,
      stage: "QUALIFYING" as const,
      estimatedCloseAt: new Date("2026-11-30T09:00:00.000Z"),
    },
    {
      client: "Savannah Fleet Logistics",
      subgroup: "Exterior Accessories",
      title: "Fleet exterior protection pack",
      estimatedAmount: "119980.00",
      routeToMarket: "TELESALES" as const,
      stage: "PROPOSAL" as const,
      estimatedCloseAt: new Date("2026-11-21T09:00:00.000Z"),
    },
    {
      client: "Eastern Auto Distributors",
      subgroup: "Towing & Hitches",
      title: "Reseller towing rope order",
      estimatedAmount: "42000.00",
      routeToMarket: "RESELLER" as const,
      stage: "NEGOTIATION" as const,
      estimatedCloseAt: new Date("2026-11-09T09:00:00.000Z"),
    },
  ];
  const seededOpportunities = new Map<
    string,
    { id: number; clientId: number; ownerId: number }
  >();
  for (const item of opportunityData) {
    const client = seededClients.get(item.client)!;
    const existing = await db.opportunity.findFirst({
      where: { clientId: client.id, title: item.title },
      select: { id: true, clientId: true, ownerId: true },
    });
    const opportunity =
      existing ??
      (await db.opportunity.create({
        data: {
          clientId: client.id,
          ownerId: client.ownerId,
          productSubgroupId: subgroupByName.get(item.subgroup)!.id,
          title: item.title,
          estimatedAmount: item.estimatedAmount,
          currency: "KES",
          routeToMarket: item.routeToMarket,
          estimatedCloseAt: item.estimatedCloseAt,
        },
        select: { id: true, clientId: true, ownerId: true },
      }));
    if (!existing && item.stage !== "NEW")
      await db.opportunity.update({
        where: { id: opportunity.id },
        data: { stage: item.stage },
      });
    seededOpportunities.set(item.title, opportunity);
  }

  const historicalOpportunityData = [
    {
      client: "Metro Auto Parts",
      subgroup: "Replacement Parts",
      title: "2025 replacement parts agreement",
      estimatedAmount: "820000.00",
      confirmedAmount: "897216.00",
      currency: "KES" as const,
      routeToMarket: "RESELLER" as const,
      outcome: "WON" as const,
      createdAt: new Date("2025-06-02T09:00:00.000Z"),
      outcomeAt: new Date("2025-08-15T09:00:00.000Z"),
    },
    {
      client: "Eastern Auto Distributors",
      subgroup: "Car Electronics",
      title: "2026 electronics distribution order",
      estimatedAmount: "1612500.00",
      confirmedAmount: "1601280.00",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "WON" as const,
      createdAt: new Date("2026-01-19T09:00:00.000Z"),
      outcomeAt: new Date("2026-03-12T09:00:00.000Z"),
    },
    {
      client: "Lakeside Motors",
      subgroup: "Garage & Car Care",
      title: "2025 workshop equipment proposal",
      estimatedAmount: "640000.00",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "LOST" as const,
      createdAt: new Date("2025-10-10T09:00:00.000Z"),
      outcomeAt: new Date("2025-12-04T09:00:00.000Z"),
    },
    {
      client: "Highland Fleet Workshop",
      subgroup: "Batteries & Accessories",
      title: "Highland fleet battery order",
      estimatedAmount: "960000.00",
      confirmedAmount: "877691.63",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "WON" as const,
      createdAt: new Date("2026-04-06T09:00:00.000Z"),
      outcomeAt: new Date("2026-06-20T09:00:00.000Z"),
    },
    {
      client: "Eastern Auto Distributors",
      subgroup: "Car Electronics",
      title: "Fictional October dealer electronics order",
      estimatedAmount: "6400000.00",
      confirmedAmount: "6099840.00",
      currency: "KES" as const,
      routeToMarket: "RESELLER" as const,
      outcome: "WON" as const,
      createdAt: new Date("2026-09-10T09:00:00.000Z"),
      outcomeAt: new Date("2026-10-05T09:00:00.000Z"),
    },
    {
      client: "Metro Auto Parts",
      subgroup: "Tires & Wheels",
      title: "Fictional October tyre proposal",
      estimatedAmount: "437040.00",
      currency: "KES" as const,
      routeToMarket: "TELESALES" as const,
      outcome: "LOST" as const,
      createdAt: new Date("2026-09-18T09:00:00.000Z"),
      outcomeAt: new Date("2026-10-08T09:00:00.000Z"),
    },
    {
      client: "Coast Fleet Services",
      subgroup: "Shelters & RV",
      title: "Fictional coastal service shelter proposal",
      estimatedAmount: "327000.00",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "LOST" as const,
      createdAt: new Date("2026-09-22T09:00:00.000Z"),
      outcomeAt: new Date("2026-10-12T09:00:00.000Z"),
    },
    {
      client: "Savannah Fleet Logistics",
      subgroup: "Tires & Wheels",
      title: "Fictional fleet tyre supply",
      estimatedAmount: "3600000.00",
      confirmedAmount: "3449880.00",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "WON" as const,
      createdAt: new Date("2026-09-01T09:00:00.000Z"),
      outcomeAt: new Date("2026-10-18T09:00:00.000Z"),
    },
    {
      client: "Highland Fleet Workshop",
      subgroup: "Batteries & Accessories",
      title: "Fictional regional fleet battery framework",
      estimatedAmount: "54300000.00",
      confirmedAmount: "53214000.00",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "WON" as const,
      createdAt: new Date("2026-08-03T09:00:00.000Z"),
      outcomeAt: new Date("2026-10-22T09:00:00.000Z"),
    },
  ];
  for (const item of historicalOpportunityData) {
    const client = seededClients.get(item.client)!;
    const exists = await db.opportunity.findFirst({
      where: { clientId: client.id, title: item.title },
    });
    const confirmedAt = item.outcomeAt;
    const conversion =
      item.outcome === "WON"
        ? convertMoneyToUsd({
            amount: item.confirmedAmount!,
            currency: item.currency,
            ...(item.currency === "KES"
              ? { rate: ILLUSTRATIVE_USD_KES_RATE }
              : {}),
            convertedAt: confirmedAt,
          })
        : null;
    if (exists) {
      await db.opportunity.update({
        where: { id: exists.id },
        data: {
          productSubgroupId: subgroupByName.get(item.subgroup)!.id,
          routeToMarket: item.routeToMarket,
          stage: "CLOSED",
          outcome: item.outcome,
          outcomeAt: item.outcomeAt,
          createdAt: item.createdAt,
          ...(conversion
            ? {
                confirmedAmount: conversion.originalAmount,
                confirmedCurrency: conversion.originalCurrency,
                confirmedAmountUsd: conversion.modelReadyAmountUsd,
                confirmedQuoteUnitsPerUsd: conversion.quoteUnitsPerUsd,
                confirmedRateSource: conversion.rateSource,
                confirmedRateObservedAt: new Date(conversion.rateObservedAt),
                confirmedAt,
              }
            : {
                confirmedAmount: null,
                confirmedCurrency: null,
                confirmedAmountUsd: null,
                confirmedQuoteUnitsPerUsd: null,
                confirmedRateSource: null,
                confirmedRateObservedAt: null,
                confirmedAt: null,
              }),
        },
      });
      seededOpportunities.set(item.title, {
        id: exists.id,
        clientId: exists.clientId,
        ownerId: exists.ownerId,
      });
      continue;
    }
    const opportunity = await db.opportunity.create({
      data: {
        clientId: client.id,
        ownerId: client.ownerId,
        productSubgroupId: subgroupByName.get(item.subgroup)!.id,
        title: item.title,
        estimatedAmount: item.estimatedAmount,
        currency: item.currency,
        routeToMarket: item.routeToMarket,
        createdAt: item.createdAt,
      },
    });
    await db.opportunity.update({
      where: { id: opportunity.id },
      data: {
        stage: "CLOSED",
        outcome: item.outcome,
        outcomeAt: item.outcomeAt,
        ...(conversion
          ? {
              confirmedAmount: conversion.originalAmount,
              confirmedCurrency: conversion.originalCurrency,
              confirmedAmountUsd: conversion.modelReadyAmountUsd,
              confirmedQuoteUnitsPerUsd: conversion.quoteUnitsPerUsd,
              confirmedRateSource: conversion.rateSource,
              confirmedRateObservedAt: new Date(conversion.rateObservedAt),
              confirmedAt,
            }
          : {}),
      },
    });
    seededOpportunities.set(item.title, {
      id: opportunity.id,
      clientId: opportunity.clientId,
      ownerId: opportunity.ownerId,
    });
  }

  const coverageVerifiedAt = new Date();
  const coverageStart = new Date(coverageVerifiedAt);
  coverageStart.setUTCFullYear(coverageStart.getUTCFullYear() - 2);
  coverageStart.setUTCHours(0, 0, 0, 0);
  const coverageEnd = new Date(coverageVerifiedAt);
  coverageEnd.setUTCHours(23, 59, 59, 999);
  const coverageSource =
    "Verification of complete AutoBridge sales records";
  for (const clientName of [
    "Metro Auto Parts",
    "Lakeside Motors",
    "Highland Fleet Workshop",
    "Eastern Auto Distributors",
  ]) {
    const client = seededClients.get(clientName)!;
    const existing = await db.clientRevenueSummary.findFirst({
      where: {
        clientId: client.id,
        evidenceSource: coverageSource,
      },
    });
    const wins = await db.opportunity.findMany({
      where: {
        clientId: client.id,
        outcome: "WON",
        outcomeAt: { gte: coverageStart, lt: coverageEnd },
        confirmedAmountUsd: { not: null },
      },
      select: { confirmedAmountUsd: true },
    });
    const amount = wins.reduce(
      (total, opportunity) => total.plus(opportunity.confirmedAmountUsd ?? 0),
      new Prisma.Decimal(0),
    );
    const coverageData = {
        clientId: client.id,
        amount,
        currency: "USD",
        coverageStart,
        coverageEnd,
        evidenceSource: coverageSource,
        declaration: (amount.isZero() ? "NO" : "YES") as "NO" | "YES",
        complete: true,
        verifiedAt: coverageVerifiedAt,
        verifiedById: admin.id,
    };
    if (existing) await db.clientRevenueSummary.update({ where: { id: existing.id }, data: coverageData });
    else await db.clientRevenueSummary.create({ data: coverageData });
  }

  const interactionData = [
    {
      opportunity: "Quarterly replacement parts order",
      interactionType: "CALL",
      notes:
        "Confirmed the required replacement-parts categories and expected order timing.",
      occurredAt: new Date("2026-10-19T07:30:00.000Z"),
    },
    {
      opportunity: "Fleet battery replacement",
      interactionType: "SITE_VISIT",
      notes: "Reviewed fleet battery specifications with the maintenance team.",
      occurredAt: new Date("2026-10-20T09:00:00.000Z"),
    },
    {
      opportunity: "Workshop care supplies",
      interactionType: "EMAIL",
      notes:
        "Sent the initial product list and requested monthly usage estimates.",
      occurredAt: new Date("2026-10-20T12:15:00.000Z"),
    },
    {
      opportunity: "Commercial fleet tyre programme",
      interactionType: "MEETING",
      notes:
        "Discussed delivery phases, tyre sizes and procurement approval steps.",
      occurredAt: new Date("2026-10-21T06:45:00.000Z"),
    },
  ];
  for (const item of interactionData) {
    const opportunity = seededOpportunities.get(item.opportunity)!;
    const exists = await db.interaction.findFirst({
      where: {
        opportunityId: opportunity.id,
        interactionType: item.interactionType,
        occurredAt: item.occurredAt,
      },
    });
    if (!exists)
      await db.interaction.create({
        data: {
          clientId: opportunity.clientId,
          opportunityId: opportunity.id,
          userId: opportunity.ownerId,
          interactionType: item.interactionType,
          notes: item.notes,
          occurredAt: item.occurredAt,
        },
      });
  }

  const followUpData = [
    {
      opportunity: "Quarterly replacement parts order",
      title: "Confirm final parts quantities",
      channel: "CALL",
      dueAt: new Date("2026-10-23T07:00:00.000Z"),
    },
    {
      opportunity: "Fleet battery replacement",
      title: "Send revised battery proposal",
      channel: "EMAIL",
      dueAt: new Date("2026-10-24T08:30:00.000Z"),
    },
    {
      opportunity: "Workshop care supplies",
      title: "Review monthly usage estimates",
      channel: "CALL",
      dueAt: new Date("2026-10-27T07:30:00.000Z"),
    },
    {
      opportunity: "Commercial fleet tyre programme",
      title: "Confirm procurement review meeting",
      channel: "MEETING",
      dueAt: new Date("2026-10-29T06:00:00.000Z"),
    },
  ];
  for (const item of followUpData) {
    const opportunity = seededOpportunities.get(item.opportunity)!;
    const exists = await db.followUp.findFirst({
      where: { opportunityId: opportunity.id, title: item.title },
    });
    if (exists)
      await db.followUp.update({
        where: { id: exists.id },
        data: { channel: item.channel },
      });
    else
      await db.followUp.create({
        data: {
          clientId: opportunity.clientId,
          opportunityId: opportunity.id,
          ownerId: opportunity.ownerId,
          title: item.title,
          channel: item.channel,
          dueAt: item.dueAt,
        },
      });
  }

  const productsBySku = new Map(
    (
      await db.product.findMany({
        where: { sku: { in: catalogueProducts.map((product) => product.sku) } },
      })
    ).map((product) => [product.sku, product]),
  );
  const seededQuotations = [
    {
      quoteNumber: "ABQ-2026-001",
      opportunity: "Quarterly replacement parts order",
      version: 1,
      status: "DRAFT" as const,
      current: true,
      discount: "0",
      items: [
        { sku: "AB-RPL-001", quantity: "300" },
        { sku: "AB-RPL-005", quantity: "120" },
        { sku: "AB-RPL-007", quantity: "40" },
      ],
    },
    {
      quoteNumber: "ABQ-2026-002",
      opportunity: "Fleet battery replacement",
      version: 1,
      status: "SENT" as const,
      current: true,
      discount: "2",
      items: [
        { sku: "AB-BAT-001", quantity: "20" },
        { sku: "AB-BAT-002", quantity: "30" },
      ],
    },
    {
      quoteNumber: "ABQ-2026-003",
      opportunity: "Workshop care supplies",
      version: 1,
      status: "DRAFT" as const,
      current: true,
      discount: "0",
      items: [
        { sku: "AB-GCC-001", quantity: "24" },
        { sku: "AB-GCC-003", quantity: "40" },
        { sku: "AB-GCC-004", quantity: "60" },
      ],
    },
    {
      quoteNumber: "ABQ-2026-004",
      opportunity: "Commercial fleet tyre programme",
      version: 1,
      status: "SUPERSEDED" as const,
      current: false,
      discount: "0",
      items: [
        { sku: "AB-TYR-001", quantity: "24" },
        { sku: "AB-TYR-002", quantity: "16" },
      ],
    },
    {
      quoteNumber: "ABQ-2026-004",
      opportunity: "Commercial fleet tyre programme",
      version: 2,
      status: "SENT" as const,
      current: true,
      discount: "5",
      supersedesVersion: 1,
      items: [
        { sku: "AB-TYR-001", quantity: "28" },
        { sku: "AB-TYR-002", quantity: "16" },
      ],
    },
    {
      quoteNumber: "ABQ-2025-005",
      opportunity: "2025 replacement parts agreement",
      version: 1,
      status: "ACCEPTED" as const,
      current: true,
      discount: "4",
      items: [
        { sku: "AB-RPL-001", quantity: "1200" },
        { sku: "AB-RPL-004", quantity: "20" },
        { sku: "AB-RPL-006", quantity: "200" },
      ],
      issueDate: new Date("2025-07-15T09:00:00.000Z"),
    },
    {
      quoteNumber: "ABQ-2026-006",
      opportunity: "2026 electronics distribution order",
      version: 1,
      status: "ACCEPTED" as const,
      current: true,
      discount: "4",
      items: [
        { sku: "AB-CEL-001", quantity: "140" },
        { sku: "AB-CEL-002", quantity: "250" },
      ],
      issueDate: new Date("2026-02-20T09:00:00.000Z"),
    },
    {
      quoteNumber: "ABQ-2025-007",
      opportunity: "2025 workshop equipment proposal",
      version: 1,
      status: "REJECTED" as const,
      current: true,
      discount: "3",
      items: [
        { sku: "AB-GCC-001", quantity: "80" },
        { sku: "AB-GCC-002", quantity: "30" },
      ],
      issueDate: new Date("2025-11-10T09:00:00.000Z"),
    },
    {
      quoteNumber: "ABQ-2026-008",
      opportunity: "Highland fleet battery order",
      version: 1,
      status: "ACCEPTED" as const,
      current: true,
      discount: "3.5",
      items: [
        { sku: "AB-BAT-003", quantity: "25" },
        { sku: "AB-BAT-004", quantity: "45" },
      ],
      issueDate: new Date("2026-05-15T09:00:00.000Z"),
    },
    {
      quoteNumber: "ABQ-2026-009",
      opportunity: "Dealer dash camera restock",
      version: 1,
      status: "DRAFT" as const,
      current: true,
      discount: "0",
      items: [{ sku: "AB-CEL-001", quantity: "40" }, { sku: "AB-CEL-002", quantity: "100" }],
    },
    {
      quoteNumber: "ABQ-2026-010",
      opportunity: "Workshop interior accessories order",
      version: 1,
      status: "DRAFT" as const,
      current: true,
      discount: "0",
      items: [{ sku: "AB-INT-001", quantity: "25" }, { sku: "AB-INT-002", quantity: "12" }, { sku: "AB-INT-003", quantity: "10" }],
    },
    {
      quoteNumber: "ABQ-2026-011",
      opportunity: "Motorcycle drivetrain spares order",
      version: 1,
      status: "SENT" as const,
      current: true,
      discount: "0",
      items: [{ sku: "AB-MCY-001", quantity: "100" }, { sku: "AB-MCY-002", quantity: "80" }],
    },
    {
      quoteNumber: "ABQ-2026-012",
      opportunity: "Field service shelter equipment",
      version: 1,
      status: "SENT" as const,
      current: true,
      discount: "2",
      items: [{ sku: "AB-SRV-001", quantity: "10" }, { sku: "AB-SRV-002", quantity: "12" }],
    },
    {
      quoteNumber: "ABQ-2026-013",
      opportunity: "Retail tyre replenishment",
      version: 1,
      status: "DRAFT" as const,
      current: true,
      discount: "0",
      items: [{ sku: "AB-TYR-001", quantity: "12" }, { sku: "AB-TYR-002", quantity: "8" }],
    },
    {
      quoteNumber: "ABQ-2026-014",
      opportunity: "Garage battery inventory",
      version: 1,
      status: "DRAFT" as const,
      current: true,
      discount: "0",
      items: [{ sku: "AB-BAT-001", quantity: "10" }, { sku: "AB-BAT-002", quantity: "15" }],
    },
    {
      quoteNumber: "ABQ-2026-015",
      opportunity: "Fleet exterior protection pack",
      version: 1,
      status: "SENT" as const,
      current: true,
      discount: "0",
      items: [{ sku: "AB-EXT-001", quantity: "20" }, { sku: "AB-EXT-002", quantity: "40" }],
    },
    {
      quoteNumber: "ABQ-2026-016",
      opportunity: "Reseller towing rope order",
      version: 1,
      status: "SENT" as const,
      current: true,
      discount: "0",
      items: [{ sku: "AB-TOW-001", quantity: "60" }],
    },
    {
      quoteNumber: "ABQ-2026-017",
      opportunity: "Fictional October dealer electronics order",
      version: 1,
      status: "ACCEPTED" as const,
      current: true,
      discount: "4.69",
      issueDate: new Date("2026-09-25T09:00:00.000Z"),
      items: [{ sku: "AB-CEL-001", quantity: "500" }, { sku: "AB-CEL-002", quantity: "2000" }],
    },
    {
      quoteNumber: "ABQ-2026-018",
      opportunity: "Fictional October tyre proposal",
      version: 1,
      status: "REJECTED" as const,
      current: true,
      discount: "0",
      issueDate: new Date("2026-10-01T09:00:00.000Z"),
      items: [{ sku: "AB-TYR-001", quantity: "8" }, { sku: "AB-TYR-002", quantity: "4" }],
    },
    {
      quoteNumber: "ABQ-2026-019",
      opportunity: "Fictional coastal service shelter proposal",
      version: 1,
      status: "REJECTED" as const,
      current: true,
      discount: "0",
      issueDate: new Date("2026-10-04T09:00:00.000Z"),
      items: [{ sku: "AB-SRV-001", quantity: "30" }],
    },
    {
      quoteNumber: "ABQ-2026-020",
      opportunity: "Fictional fleet tyre supply",
      version: 1,
      status: "ACCEPTED" as const,
      current: true,
      discount: "4.17",
      issueDate: new Date("2026-10-10T09:00:00.000Z"),
      items: [{ sku: "AB-TYR-002", quantity: "80" }],
    },
    {
      quoteNumber: "ABQ-2026-021",
      opportunity: "Fictional regional fleet battery framework",
      version: 1,
      status: "ACCEPTED" as const,
      current: true,
      discount: "2",
      issueDate: new Date("2026-10-14T09:00:00.000Z"),
      items: [{ sku: "AB-BAT-003", quantity: "2500" }],
    },
  ];
  const quoteIds = new Map<string, number>();
  for (const quotationData of seededQuotations) {
    const existing = await db.quotation.findUnique({
      where: {
        quoteNumber_version: {
          quoteNumber: quotationData.quoteNumber,
          version: quotationData.version,
        },
      },
    });
    if (existing) {
      quoteIds.set(
        `${quotationData.quoteNumber}-${quotationData.version}`,
        existing.id,
      );
      if (existing.current)
        await db.opportunity.update({
          where: { id: existing.opportunityId },
          data: { estimatedAmount: existing.totalAmount, currency: "KES" },
        });
      continue;
    }
    const opportunity = seededOpportunities.get(quotationData.opportunity)!;
    const client = [...seededClients.values()].find(
      (candidate) => candidate.id === opportunity.clientId,
    )!;
    const items = quotationData.items.map((item) => {
      const product = productsBySku.get(item.sku)!;
      const quantity = new Prisma.Decimal(item.quantity);
      const unitPrice = product.defaultSellingPrice;
      return {
        productId: product.id,
        skuSnapshot: product.sku,
        productNameSnapshot: product.name,
        brandSnapshot: product.brand,
        descriptionSnapshot: product.description,
        unitSnapshot: product.unitOfMeasure,
        quantity,
        unitPrice,
        lineTotal: quantity.mul(unitPrice),
      };
    });
    const subtotal = items
      .reduce(
        (total, item) => total.plus(item.lineTotal),
        new Prisma.Decimal(0),
      )
      .toDecimalPlaces(2);
    const discountPercent = new Prisma.Decimal(quotationData.discount);
    const discountAmount = subtotal
      .mul(discountPercent)
      .div(100)
      .toDecimalPlaces(2);
    const totalAmount = subtotal.minus(discountAmount).toDecimalPlaces(2);
    const issued = quotationData.status !== "DRAFT";
    const issuedAt = "issueDate" in quotationData && quotationData.issueDate
      ? quotationData.issueDate
      : new Date(quotationData.quoteNumber.includes("2025") ? "2025-07-15T09:00:00.000Z" : "2026-10-26T09:00:00.000Z");
    const created = await db.quotation.create({
      data: {
        quoteNumber: quotationData.quoteNumber,
        version: quotationData.version,
        opportunityId: opportunity.id,
        clientId: client.id,
        createdById: opportunity.ownerId,
        supersedesId:
          "supersedesVersion" in quotationData
            ? quoteIds.get(
                `${quotationData.quoteNumber}-${quotationData.supersedesVersion}`,
              )
            : null,
        status: quotationData.status,
        current: quotationData.current,
        currency: "KES",
        issueDate: issued ? issuedAt : null,
        validUntil: new Date(issuedAt.getTime() + 30 * 86_400_000),
        subtotal,
        discountPercent,
        discountAmount,
        totalAmount,
        clientNameSnapshot: client.businessName,
        clientAddressSnapshot: `${client.locationAddress}, ${client.countyName}`,
        terms:
          "Prices are valid until the date shown and subject to product availability.",
        ...(issued ? { sentAt: issuedAt } : {}),
        ...(["ACCEPTED", "REJECTED"].includes(quotationData.status)
          ? { decidedAt: new Date(issuedAt.getTime() + 5 * 86_400_000) }
          : {}),
        ...(quotationData.status === "SUPERSEDED"
          ? { supersededAt: new Date("2026-10-26T09:00:00.000Z") }
          : {}),
        items: { create: items },
      },
    });
    quoteIds.set(
      `${quotationData.quoteNumber}-${quotationData.version}`,
      created.id,
    );
    if (quotationData.current)
      await db.opportunity.update({
        where: { id: opportunity.id },
        data: { estimatedAmount: totalAmount, currency: "KES" },
      });
  }

  for (const opportunity of seededOpportunities.values()) {
    const currentQuotation = await db.quotation.findFirst({
      where: { opportunityId: opportunity.id, current: true },
      orderBy: [{ version: "desc" }, { id: "desc" }],
      select: { totalAmount: true, currency: true },
    });
    if (currentQuotation) {
      await db.opportunity.update({
        where: { id: opportunity.id },
        data: { estimatedAmount: currentQuotation.totalAmount, currency: currentQuotation.currency },
      });
    }
  }

  console.log(
    `${mode} users, clients, sales history, catalogue, quotations, activities, and revenue coverage ready`,
  );
}

const seedEmails = [email!, "samuel@autobridge.com", "grace@autobridge.com"];
const credentialKeys = ["ADMIN_PASSWORD", "SAMUEL_PASSWORD", "GRACE_PASSWORD"] as const;

async function retainedPasswords(): Promise<[string, string, string]> {
  const file = resolve(process.env.SEED_CREDENTIALS_FILE ?? ".env.production.seed");
  try {
    const info = await lstat(file);
    if (!info.isFile() || (info.mode & 0o077) !== 0)
      throw new Error("Seed credential file must be a regular file accessible only to its owner (chmod 600)");
    const values = parse(await readFile(file));
    const passwords = credentialKeys.map((key) => values[key]);
    if (passwords.some((value) => !value || value.length < 6 || value.length > 128) || new Set(passwords).size !== 3)
      throw new Error("Seed credential file requires three distinct passwords of 6 to 128 characters; restore retained credentials or rotate through the account workflow");
    return passwords as [string, string, string];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const passwords = credentialKeys.map(() => randomBytes(32).toString("base64url")) as [string, string, string];
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(credentialKeys.map((key, index) => `${key}=${passwords[index]}\n`).join(""));
  } finally {
    await handle.close();
  }
  console.log(`New account credentials retained in ${file}; keep this ignored file or a secure backup for database recreation`);
  return passwords;
}

async function verifyCore() {
  const users = await prisma.user.findMany({ where: { email: { in: seedEmails } }, select: { email: true, role: true, active: true, approvedAt: true } });
  const groups = await prisma.productGroup.findMany({ include: { subgroups: true } });
  const catalogue = await prisma.product.findMany({ where: { sku: { in: catalogueProducts.map((item) => item.sku) } }, include: { productSubgroup: { include: { productGroup: true } } } });
  assert.equal(users.length, 3, "Seed accounts are incomplete; inspect this database before retrying");
  assert.ok(users.every((user) => user.active && user.approvedAt && user.role === (user.email === email ? "ADMIN" : "SALES_REP")), "Seed account roles or approval status differ");
  for (const [group, subgroups] of Object.entries(productGroups)) {
    const seededGroup = groups.find((item) => item.name === group);
    assert.ok(seededGroup && subgroups.every((name) => seededGroup.subgroups.some((subgroup) => subgroup.name === name)), "Automotive catalogue groups or subgroups are incomplete");
  }
  assert.equal(catalogue.length, catalogueProducts.length, "Automotive catalogue is incomplete; inspect this database before retrying");
  assert.ok(catalogueProducts.every((item) => catalogue.some((product) =>
    product.sku === item.sku && product.productSubgroup.name === item.subgroup
    && product.currency === "KES" && product.priceClassification === "PUBLIC_RETAIL_REFERENCE"
    && product.active === ("active" in item ? item.active : true)
    && product.priceSourceUrl === item.url)), "Automotive catalogue details differ from the seed");
  return { users: users.length, products: catalogue.length };
}

async function preflight() {
  const [users, groups, subgroups, products, clientCount, opportunities, quotations, quotationItems, contacts, interactions, followUps, coverages, predictions, reviews, capacities, sessions] = await Promise.all([
    prisma.user.count(), prisma.productGroup.count(), prisma.productSubgroup.count(), prisma.product.count(),
    prisma.client.count(), prisma.opportunity.count(), prisma.quotation.count(),
    prisma.quotationItem.count(),
    prisma.contact.count(), prisma.interaction.count(), prisma.followUp.count(),
    prisma.clientRevenueSummary.count(), prisma.opportunityPrediction.count(), prisma.predictionReview.count(),
    prisma.weeklySalesCapacity.count(), prisma.session.count(),
  ]);
  const empty = [users, groups, subgroups, products, clientCount, opportunities, quotations, quotationItems, contacts, interactions, followUps, coverages, predictions, reviews, capacities, sessions].every((count) => count === 0);
  if (empty) return "EMPTY" as const;
  await verifyCore();
  if (mode === "production") return "EXISTING" as const;
  const baseClients = 7;
  const baseOpportunities = 21;
  const baseQuotations = 22;
  const demoCount = await prisma.opportunity.count({ where: { title: { startsWith: "Demo seed: " } } });
  const namedClients = await prisma.client.count({ where: { businessName: { in: clients.map((item) => item.businessName) } } });
  const labelledFollowUps = await prisma.followUp.count({ where: { title: { startsWith: "Demo seed: " } } });
  if (clientCount !== baseClients || namedClients !== baseClients || contacts !== 6 || interactions !== 4 || coverages !== 4
    || followUps !== 4 + labelledFollowUps || predictions > demoCount)
    throw new Error("Database has non-demo or incomplete sales records; demonstration seed refused without changes");
  if ((clientCount === baseClients && opportunities === baseOpportunities && quotations === baseQuotations && demoCount === 0)
    || (demoCount > 0 && demoCount <= 20 && clientCount === baseClients
      && opportunities === baseOpportunities + demoCount
      && quotations === baseQuotations + demoCount)) return "RESUME_DEMO" as const;
  throw new Error("Database contains non-demo or inconsistent sales data; demonstration seed refused without changes");
}

const demoItems = [
  ["Metro Auto Parts", "AB-BAT-001", "18", "FIELDS_SALES", "Fleet battery renewal"],
  ["Rift Valley Garage", "AB-RPL-001", "240", "RESELLER", "Spark plug restock"],
  ["Eastern Auto Distributors", "AB-CEL-001", "35", "RESELLER", "Dash camera distribution"],
  ["Highland Fleet Workshop", "AB-TYR-001", "14", "FIELDS_SALES", "Regional tyre programme"],
  ["Metro Auto Parts", "AB-RPL-004", "16", "TELESALES", "Brake disc replenishment"],
  ["Rift Valley Garage", "AB-GCC-001", "26", "FIELDS_SALES", "Workshop lubricant supply"],
  ["Eastern Auto Distributors", "AB-BAT-003", "38", "RESELLER", "Battery distribution order"],
  ["Highland Fleet Workshop", "AB-RPL-005", "160", "TELECOVERAGE", "Fleet oil filter stock"],
  ["Metro Auto Parts", "AB-TOW-001", "25", "RESELLER", "Recovery equipment order"],
  ["Rift Valley Garage", "AB-MCY-001", "28", "FIELDS_SALES", "Motorcycle service kits"],
  ["Eastern Auto Distributors", "AB-EXT-001", "40", "TELESALES", "Exterior protection range"],
  ["Highland Fleet Workshop", "AB-BAT-002", "50", "FIELDS_SALES", "Workshop battery order"],
  ["Metro Auto Parts", "AB-INT-001", "45", "RESELLER", "Cabin accessory restock"],
  ["Rift Valley Garage", "AB-RPL-007", "70", "TELECOVERAGE", "Air filter supply"],
  ["Eastern Auto Distributors", "AB-TYR-002", "24", "FIELDS_SALES", "Tyre reseller programme"],
  ["Highland Fleet Workshop", "AB-GCC-003", "36", "TELESALES", "Fleet DEF replenishment"],
  ["Metro Auto Parts", "AB-BAT-004", "55", "FIELDS_SALES", "Battery retail replenishment"],
  ["Rift Valley Garage", "AB-RPL-006", "90", "RESELLER", "Fuel filter stock"],
  ["Eastern Auto Distributors", "AB-SRV-001", "15", "TELECOVERAGE", "Field service shelter supply"],
  ["Highland Fleet Workshop", "AB-GCC-002", "20", "FIELDS_SALES", "Workshop coolant order"],
] as const;
const demoMinutes = [240, 30, 15, 180, 90, 60, 30, 180, 15, 120, 240, 180, 90, 15, 90, 180, 240, 15, 180, 60] as const;

async function seedDemo() {
  const week = process.env.SEED_DEMO_WEEK_START ?? "2026-11-23";
  const start = new Date(`${week}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !Number.isFinite(start.getTime()) || start.getUTCDay() !== 1 || start <= new Date())
    throw new Error("SEED_DEMO_WEEK_START must be a future Monday (UTC); choose a later week if 23 November has begun");
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: seedEmails[1] } });
  const actor = { id: owner.id, role: "SALES_REP" as const };
  const clientsByName = new Map((await prisma.client.findMany({ where: { ownerId: owner.id, businessName: { in: demoItems.map((item) => item[0]) } } })).map((item) => [item.businessName, item]));
  const productsBySku = new Map((await prisma.product.findMany({ where: { sku: { in: demoItems.map((item) => item[1]) }, active: true } })).map((item) => [item.sku, item]));
  const service = new OpportunityService();
  const scoring = new OpportunityScoringService();
  const opportunities: Opportunity[] = [];
  for (const [clientName, sku, quantity, routeToMarket, label] of demoItems) {
    const client = clientsByName.get(clientName);
    const product = productsBySku.get(sku);
    assert.ok(client && product, `Missing owned client or active catalogue product for ${label}`);
    const title = `Demo seed: ${label}`;
    const matches = await prisma.opportunity.findMany({ where: { title } });
    assert.ok(matches.length <= 1 && (!matches[0] || (matches[0].clientId === client.id && matches[0].ownerId === owner.id && matches[0].outcome === null)), `Conflicting demonstration opportunity: ${title}`);
    if (matches[0]) {
      const expectedAmount = product.defaultSellingPrice.mul(quantity).toDecimalPlaces(2);
      assert.ok(matches[0].estimatedAmount.equals(expectedAmount) && matches[0].routeToMarket === routeToMarket
        && matches[0].productSubgroupId === product.productSubgroupId && matches[0].stage !== "CLOSED",
      `Demonstration opportunity was edited; seed will not rescore or overwrite ${title}`);
    }
    const opportunity = matches[0] ?? await service.create(actor, {
      clientId: client.id, productSubgroupId: product.productSubgroupId, title, routeToMarket,
      estimatedCloseAt: new Date(start.getTime() + 21 * 86_400_000).toISOString(),
      items: [{ productId: product.id, quantity }],
    });
    opportunities.push(opportunity);
  }
  const predictions: OpportunityPrediction[] = [];
  for (const opportunity of opportunities) {
    const prediction = await scoring.score(actor, opportunity.id);
    assert.ok(prediction && prediction.explanation && typeof prediction.explanation === "object" && "status" in prediction.explanation && prediction.explanation.status === "available", `Genuine model prediction and SHAP required for ${opportunity.title}`);
    predictions.push(prediction);
  }
  assert.ok(predictions.some((item) => item.modelVariant === "PRIMARY") && predictions.some((item) => item.modelVariant === "LIMITED_HISTORY"), "Both model variants are required");
  const actions = opportunities.flatMap((opportunity, index) => [
    { opportunity, minutes: demoMinutes[index], key: "primary", channel: demoMinutes[index] <= 15 ? "EMAIL" : demoMinutes[index] <= 30 ? "CALL" : demoMinutes[index] <= 90 ? "MEETING" : "SITE_VISIT" },
    ...(index < 4 ? [{ opportunity, minutes: demoMinutes[index], key: "alternate", channel: ["MEETING", "EMAIL", "CALL", "MEETING"][index] }] : []),
  ]);
  const slots = Array.from({ length: 6 }, () => 0);
  const proposed = actions.map((action, index) => {
    const day = slots.findIndex((used) => used + action.minutes <= 540);
    assert.ok(day >= 0, "Demo follow-ups do not fit the selected week without overlap");
    const dueAt = new Date(start.getTime() + day * 86_400_000 + (300 + slots[day]) * 60_000);
    slots[day] += action.minutes;
    const prediction = predictions[opportunities.findIndex((item) => item.id === action.opportunity.id)];
    const valueUsd = new Prisma.Decimal(String((prediction.conversionSnapshot as { modelReadyAmountUsd: string }).modelReadyAmountUsd));
    return {
      id: index + 1, opportunityId: action.opportunity.id, title: action.opportunity.title,
      clientName: "", channel: action.channel, dueAt, probability: Number(prediction.wonProbability),
      valueUsd: valueUsd.toFixed(2), expectedValueUsd: valueUsd.mul(prediction.wonProbability).toFixed(2),
      attention: null, effortMinutes: action.minutes, key: action.key, clientId: action.opportunity.clientId,
    };
  });
  const comparison = [25, 30].map((hours) => ({ hours, result: optimizeWeekly(proposed, hours * 60) }));
  const selected = comparison.find(({ result }) => result.baselines.every((base) => new Prisma.Decimal(base.expectedValueUsd).lt(result.optimal.expectedValueUsd)));
  if (!selected) throw new Error("Genuine model outputs did not yield a strict Knapsack improvement at 25 or 30 hours; review the synthetic scenario before scheduling");
  for (const row of proposed) {
    const title = `Demo seed: ${row.key} follow-up for ${row.title.slice(11)}`;
    const existing = await prisma.followUp.findFirst({ where: { ownerId: owner.id, title } });
    if (existing) {
      assert.ok(existing.opportunityId === row.opportunityId && existing.clientId === row.clientId
        && existing.dueAt.getTime() === row.dueAt.getTime() && existing.estimatedMinutes === row.effortMinutes
        && existing.completedAt === null, `Demonstration follow-up was edited; seed will not overwrite ${title}`);
      continue;
    }
    await prisma.followUp.create({ data: { ownerId: owner.id, clientId: row.clientId, opportunityId: row.opportunityId, title, channel: row.channel, dueAt: row.dueAt, estimatedMinutes: row.effortMinutes } });
  }
  const completedTitle = "Demo seed: completed battery requirements meeting";
  const completed = await prisma.followUp.findFirst({ where: { ownerId: owner.id, title: completedTitle } });
  if (!completed) {
    const dueAt = new Date(start.getTime() - 4 * 86_400_000 + 6 * 3_600_000);
    await prisma.followUp.create({ data: { ownerId: owner.id, clientId: opportunities[0].clientId,
      opportunityId: opportunities[0].id, title: completedTitle, channel: "MEETING", dueAt,
      estimatedMinutes: 60, completedAt: new Date(dueAt.getTime() + 60 * 60_000) } });
  } else assert.ok(completed.opportunityId === opportunities[0].id && completed.completedAt, "Completed demo follow-up was edited");
  const capacity = await prisma.weeklySalesCapacity.findUnique({ where: { userId_weekStart: { userId: owner.id, weekStart: start } } });
  if (!capacity) await prisma.weeklySalesCapacity.create({ data: { userId: owner.id, weekStart: start, availableMinutes: selected.hours * 60 } });
  else assert.equal(capacity.availableMinutes, selected.hours * 60, "Demo capacity was changed; seed will not overwrite it");
  await verifyDemo();
}

async function verifyDemo() {
  const week = process.env.SEED_DEMO_WEEK_START ?? "2026-11-23";
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: seedEmails[1] } });
  const titles = demoItems.map((item) => `Demo seed: ${item[4]}`);
  const opportunities = await prisma.opportunity.findMany({
    where: { ownerId: owner.id, title: { in: titles } },
    include: { predictions: { orderBy: [{ predictedAt: "desc" }, { id: "desc" }], take: 1 }, quotations: { where: { current: true }, include: { items: true } } },
  });
  assert.equal(opportunities.length, demoItems.length, "Demonstration opportunities are incomplete");
  assert.ok(opportunities.every((item) => item.predictions.length === 1 && item.predictions[0].explanation &&
    typeof item.predictions[0].explanation === "object" && !Array.isArray(item.predictions[0].explanation) &&
    "status" in item.predictions[0].explanation && item.predictions[0].explanation.status === "available" &&
    item.quotations.length === 1 && item.quotations[0].items.length > 0), "Genuine predictions, SHAP, or itemized quotations are missing");
  const actor = { id: owner.id, role: "SALES_REP" as const };
  const allocation = new WeeklyAllocationService();
  const plan = await allocation.plan(actor, week);
  assert.equal(plan.candidates.length, demoItems.length + 4, "Weekly planner candidate set is incomplete");
  assert.ok(plan.candidates.every((item) => titles.includes(item.title)
    && new Prisma.Decimal(item.valueUsd).mul(item.probability).minus(item.expectedValueUsd).abs().lte("0.01")),
  "Candidate ownership or probability-weighted value differs from the seeded scenario");
  assert.ok(!plan.excluded.some((item) => titles.includes(item.title)), "Demonstration predictions are stale or otherwise ineligible");
  assert.ok(plan.comparisons.slice(1).every((base) => new Prisma.Decimal(base.expectedValueUsd).lt(plan.selectedExpectedValueUsd)), "Knapsack does not exceed every greedy baseline");
  const names = new Map(plan.candidates.map((item) => [item.id, `${item.title} (${item.channel}, ${item.effortMinutes} min)`]));
  const results = plan.comparisons.map((item) => ({ method: item.method, selectedFollowUps: item.ids.map((id) => names.get(id)),
    allocatedHours: item.allocatedMinutes / 60, weightedValueUsd: item.expectedValueUsd,
    shareOfBestPercent: Number(new Prisma.Decimal(item.expectedValueUsd).div(plan.selectedExpectedValueUsd).mul(100).toFixed(1)) }));
  for (const result of plan.comparisons) {
    const chosen = plan.candidates.filter((item) => result.ids.includes(item.id));
    assert.equal(new Set(chosen.map((item) => item.opportunityId)).size, chosen.length, "One follow-up per opportunity invariant failed");
    assert.ok(result.allocatedMinutes <= (plan.remainingMinutes ?? 0), "Capacity exceeded");
  }
  const schedule = [...plan.candidates].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  assert.ok(schedule.every((item, index) => index === 0 || schedule[index - 1].dueAt.getTime()
    + schedule[index - 1].effortMinutes * 60_000 <= item.dueAt.getTime()), "Demo follow-ups overlap");
  const repeated = await allocation.plan(actor, week);
  assert.deepEqual(repeated.comparisons.map((item) => [item.method, item.ids, item.expectedValueUsd]),
    plan.comparisons.map((item) => [item.method, item.ids, item.expectedValueUsd]), "Planner results changed without data changes");
  const alternativeBudgets = [25, 30].map((hours) => {
    const budget = hours * 60 - plan.completedMinutes;
    const comparison = optimizeWeekly(plan.candidates, budget);
    return { weeklyHours: hours, remainingHours: budget / 60,
      valuesUsd: [comparison.optimal.expectedValueUsd, ...comparison.baselines.map((item) => item.expectedValueUsd)] };
  });
  assert.ok(alternativeBudgets.every((item) => item.valuesUsd.slice(1).every((value) => new Prisma.Decimal(value).lt(item.valuesUsd[0]))),
    "The 25- and 30-hour alternatives must both show strict improvement");
  console.log(JSON.stringify({ week, representative: owner.email, weeklyHours: (plan.availableMinutes ?? 0) / 60,
    completedHours: plan.completedMinutes / 60, remainingHours: (plan.remainingMinutes ?? 0) / 60,
    modelVariants: opportunities.map((item) => item.predictions[0].modelVariant).reduce((counts, variant) => ({ ...counts, [variant]: counts[variant] + 1 }), { PRIMARY: 0, LIMITED_HISTORY: 0 }),
    alternativeBudgets, results }, null, 2));
}

try {
  if (mode === "verify") {
    const summary = await verifyCore();
    console.log(`Read-only seed verification: ${summary.users} approved accounts, ${summary.products} catalogue products`);
    if (process.env.SEED_DEMO_WEEK_START) await verifyDemo();
  } else if (mode === "development") {
    await seedBase(prisma, [developmentPassword!, developmentPassword!, developmentPassword!], false);
  } else {
    if (mode === "demo") {
      const week = process.env.SEED_DEMO_WEEK_START ?? "2026-11-23";
      const start = new Date(`${week}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !Number.isFinite(start.getTime()) || start.getUTCDay() !== 1 || start <= new Date())
        throw new Error("Set SEED_DEMO_WEEK_START to a future Monday before adding demonstration records");
      if (!process.env.ML_API_URL || !process.env.ML_API_TOKEN)
        throw new Error("ML_API_URL and ML_API_TOKEN are required for genuine demonstration predictions");
      const ready = await fetch(`${process.env.ML_API_URL.replace(/\/$/, "")}/ready`, { signal: AbortSignal.timeout(10_000) });
      if (!ready.ok) throw new Error(`FastAPI is not ready (${ready.status}); no demonstration records were changed`);
    }
    const state = await preflight();
    if (state === "EMPTY") {
      const passwords = await retainedPasswords();
      await prisma.$transaction(async (tx) => {
        if (await tx.user.count() || await tx.product.count() || await tx.client.count())
          throw new Error("Database changed during seed preflight; initialization refused");
        await seedBase(tx, passwords, mode === "production");
      }, { timeout: 300_000 });
    }
    const summary = await verifyCore();
    if (mode === "demo") await seedDemo();
    console.log(`Seed ${mode} complete: ${summary.users} approved accounts, ${summary.products} catalogue products`);
  }
} catch (error) {
  const message = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
    ? "Database tables are missing; run npx prisma migrate deploy first"
    : error instanceof Error ? error.message : "unknown error";
  console.error(`Seed ${mode} failed: ${message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
