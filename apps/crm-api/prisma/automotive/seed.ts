import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/client.js";
import {
  convertMoneyToUsd,
  ILLUSTRATIVE_USD_KES_RATE,
} from "../../src/domain/currency.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const firstName = process.env.ADMIN_FIRST_NAME?.trim();
const lastName = process.env.ADMIN_LAST_NAME?.trim();
const databaseUrl = process.env.DATABASE_URL_ADMIN;

if (process.env.NODE_ENV !== "development")
  throw new Error("Development seed requires NODE_ENV=development");
if (
  !databaseUrl ||
  !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)
) {
  throw new Error("Development seed requires a local PostgreSQL connection");
}
if (
  !email ||
  !/^\S+@\S+\.\S+$/.test(email) ||
  !password ||
  password.length < 8 ||
  !firstName ||
  !lastName
) {
  throw new Error(
    "Set ADMIN_EMAIL, ADMIN_PASSWORD (8+ characters), ADMIN_FIRST_NAME and ADMIN_LAST_NAME in the API .env",
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

const observedAt = new Date("2026-10-26T00:00:00.000Z");
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
] as const;

try {
  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      take: 2,
    });
    if (
      admins.length > 1 ||
      (admins.length === 0 && (await prisma.user.count()) > 0)
    ) {
      throw new Error(
        "Cannot identify a unique development administrator; seed stopped without changing users",
      );
    }
    admin =
      admins[0] ??
      (await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: await bcrypt.hash(password, 12),
          role: "ADMIN",
        },
      }));
  }
  if (admin.role !== "ADMIN")
    throw new Error("ADMIN_EMAIL belongs to a non-admin user");
  const passwordChanged = !(await bcrypt.compare(password, admin.passwordHash));
  if (
    admin.email !== email ||
    admin.firstName !== firstName ||
    admin.lastName !== lastName ||
    passwordChanged ||
    !admin.active
  ) {
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: {
        email,
        firstName,
        lastName,
        active: true,
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

  const firstRep = await prisma.user.upsert({
    where: { email: "samuel.sales@autobridge.test" },
    update: { firstName: "Samuel", lastName: "Kamau", active: true },
    create: {
      email: "samuel.sales@autobridge.test",
      firstName: "Samuel",
      lastName: "Kamau",
      passwordHash: await bcrypt.hash(password, 12),
      role: "SALES_REP",
    },
  });
  const secondRep = await prisma.user.upsert({
    where: { email: "grace.sales@autobridge.test" },
    update: { firstName: "Grace", lastName: "Achieng", active: true },
    create: {
      email: "grace.sales@autobridge.test",
      firstName: "Grace",
      lastName: "Achieng",
      passwordHash: await bcrypt.hash(password, 12),
      role: "SALES_REP",
    },
  });

  for (const [index, client] of clients.entries()) {
    const ownerId = index % 2 === 0 ? firstRep.id : secondRep.id;
    const exists = await prisma.client.findFirst({
      where: { businessName: client.businessName },
    });
    if (exists)
      await prisma.client.update({
        where: { id: exists.id },
        data: { ownerId },
      });
    else await prisma.client.create({ data: { ...client, ownerId } });
  }
  for (const [name, subgroups] of Object.entries(productGroups)) {
    const group = await prisma.productGroup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    for (const subgroupName of subgroups) {
      await prisma.productSubgroup.upsert({
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
      await prisma.client.findMany({
        where: {
          businessName: { in: clients.map((client) => client.businessName) },
        },
      })
    ).map((client) => [client.businessName, client]),
  );
  const subgroupByName = new Map(
    (await prisma.productSubgroup.findMany()).map((subgroup) => [
      subgroup.name,
      subgroup,
    ]),
  );

  for (const product of catalogueProducts) {
    await prisma.product.upsert({
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
    const exists = await prisma.contact.findFirst({
      where: { clientId: client.id, email: contact.email },
    });
    if (!exists)
      await prisma.contact.create({
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
  ];
  const seededOpportunities = new Map<
    string,
    { id: number; clientId: number; ownerId: number }
  >();
  for (const item of opportunityData) {
    const client = seededClients.get(item.client)!;
    const existing = await prisma.opportunity.findFirst({
      where: { clientId: client.id, title: item.title },
      select: { id: true, clientId: true, ownerId: true },
    });
    const opportunity =
      existing ??
      (await prisma.opportunity.create({
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
      await prisma.opportunity.update({
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
      confirmedAmount: "780000.00",
      currency: "KES" as const,
      routeToMarket: "RESELLER" as const,
      outcome: "WON" as const,
      outcomeAt: new Date("2025-08-15T09:00:00.000Z"),
    },
    {
      client: "Eastern Auto Distributors",
      subgroup: "Car Electronics",
      title: "2026 electronics distribution order",
      estimatedAmount: "1612500.00",
      confirmedAmount: "1612500.00",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "WON" as const,
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
      outcomeAt: new Date("2025-12-04T09:00:00.000Z"),
    },
    {
      client: "Highland Fleet Workshop",
      subgroup: "Batteries & Accessories",
      title: "Highland fleet battery order",
      estimatedAmount: "960000.00",
      confirmedAmount: "910000.00",
      currency: "KES" as const,
      routeToMarket: "FIELDS_SALES" as const,
      outcome: "WON" as const,
      outcomeAt: new Date("2026-06-20T09:00:00.000Z"),
    },
  ];
  for (const item of historicalOpportunityData) {
    const client = seededClients.get(item.client)!;
    const exists = await prisma.opportunity.findFirst({
      where: { clientId: client.id, title: item.title },
    });
    if (exists) {
      seededOpportunities.set(item.title, {
        id: exists.id,
        clientId: exists.clientId,
        ownerId: exists.ownerId,
      });
      continue;
    }
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
    const opportunity = await prisma.opportunity.create({
      data: {
        clientId: client.id,
        ownerId: client.ownerId,
        productSubgroupId: subgroupByName.get(item.subgroup)!.id,
        title: item.title,
        estimatedAmount: item.estimatedAmount,
        currency: item.currency,
        routeToMarket: item.routeToMarket,
      },
    });
    await prisma.opportunity.update({
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

  const coverageStart = new Date("2024-10-26T00:00:00.000Z");
  const coverageEnd = new Date("2026-10-26T23:59:59.999Z");
  const coverageVerifiedAt = new Date("2026-10-26T08:00:00.000Z");
  const coverageSource =
    "Verification of complete AutoBridge sales records";
  for (const clientName of [
    "Metro Auto Parts",
    "Lakeside Motors",
    "Highland Fleet Workshop",
  ]) {
    const client = seededClients.get(clientName)!;
    const existing = await prisma.clientRevenueSummary.findFirst({
      where: {
        clientId: client.id,
        coverageStart,
        coverageEnd,
        evidenceSource: coverageSource,
      },
    });
    if (existing) continue;
    const wins = await prisma.opportunity.findMany({
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
    await prisma.clientRevenueSummary.create({
      data: {
        clientId: client.id,
        amount,
        currency: "USD",
        coverageStart,
        coverageEnd,
        evidenceSource: coverageSource,
        declaration: amount.isZero() ? "NO" : "YES",
        complete: true,
        verifiedAt: coverageVerifiedAt,
        verifiedById: admin.id,
      },
    });
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
    const exists = await prisma.interaction.findFirst({
      where: {
        opportunityId: opportunity.id,
        interactionType: item.interactionType,
        occurredAt: item.occurredAt,
      },
    });
    if (!exists)
      await prisma.interaction.create({
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
    const exists = await prisma.followUp.findFirst({
      where: { opportunityId: opportunity.id, title: item.title },
    });
    if (exists)
      await prisma.followUp.update({
        where: { id: exists.id },
        data: { channel: item.channel },
      });
    else
      await prisma.followUp.create({
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
      await prisma.product.findMany({
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
    },
  ];
  const quoteIds = new Map<string, number>();
  for (const quotationData of seededQuotations) {
    const existing = await prisma.quotation.findUnique({
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
      if (quotationData.current)
        await prisma.opportunity.update({
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
    const issuedAt = new Date(
      quotationData.quoteNumber.includes("2025")
        ? "2025-07-15T09:00:00.000Z"
        : "2026-10-26T09:00:00.000Z",
    );
    const created = await prisma.quotation.create({
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
      await prisma.opportunity.update({
        where: { id: opportunity.id },
        data: { estimatedAmount: totalAmount, currency: "KES" },
      });
  }

  console.log(
    "Development users, clients, sales history, catalogue, quotations, activities, and revenue coverage ready",
  );
} finally {
  await prisma.$disconnect();
}
