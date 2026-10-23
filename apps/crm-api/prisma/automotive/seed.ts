import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/client.js";
import { convertMoneyToUsd, ILLUSTRATIVE_USD_KES_RATE } from "../../src/domain/currency.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const firstName = process.env.ADMIN_FIRST_NAME?.trim();
const lastName = process.env.ADMIN_LAST_NAME?.trim();
const databaseUrl = process.env.DATABASE_URL_ADMIN;

if (process.env.NODE_ENV !== "development") throw new Error("Development seed requires NODE_ENV=development");
if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Development seed requires a local PostgreSQL connection");
}
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 8 || !firstName || !lastName) {
  throw new Error("Set ADMIN_EMAIL, ADMIN_PASSWORD (8+ characters), ADMIN_FIRST_NAME and ADMIN_LAST_NAME in the API .env");
}

const clients = [
  { businessName: "Metro Auto Parts", countyName: "Nairobi", locationAddress: "Industrial Area", shortHistory: "Supplies parts to local garages." },
  { businessName: "Coast Fleet Services", countyName: "Mombasa", locationAddress: "Changamwe", shortHistory: "Maintains commercial vehicles." },
  { businessName: "Rift Valley Garage", countyName: "Nakuru", locationAddress: "Nakuru town", shortHistory: "Repairs passenger and fleet vehicles." },
  { businessName: "Lakeside Motors", countyName: "Kisumu", locationAddress: "Mamboleo", shortHistory: "Services passenger vehicles and regional fleets." },
  { businessName: "Eastern Auto Distributors", countyName: "Machakos", locationAddress: "Mlolongo", shortHistory: "Distributes replacement parts to independent garages." },
  { businessName: "Savannah Fleet Logistics", countyName: "Nairobi", locationAddress: "Embakasi", shortHistory: "Operates a mixed commercial vehicle fleet." },
  { businessName: "Highland Fleet Workshop", countyName: "Nyeri", locationAddress: "Kamakwa", shortHistory: "Synthetic development client maintaining regional commercial fleets." },
];

const productGroups: Record<string, string[]> = {
  "Car Accessories": ["Batteries & Accessories", "Exterior Accessories", "Garage & Car Care", "Interior Accessories", "Replacement Parts", "Towing & Hitches"],
  "Car Electronics": ["Car Electronics"],
  "Performance & Non-auto": ["Motorcycle Parts", "Shelters & RV"],
  "Tires & Wheels": ["Tires & Wheels"],
};

try {
  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, take: 2 });
    if (admins.length > 1 || (admins.length === 0 && await prisma.user.count() > 0)) {
      throw new Error("Cannot identify a unique development administrator; seed stopped without changing users");
    }
    admin = admins[0] ?? await prisma.user.create({ data: {
      email, firstName, lastName, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN",
    } });
  }
  if (admin.role !== "ADMIN") throw new Error("ADMIN_EMAIL belongs to a non-admin user");
  const passwordChanged = !(await bcrypt.compare(password, admin.passwordHash));
  if (admin.email !== email || admin.firstName !== firstName || admin.lastName !== lastName || passwordChanged || !admin.active) {
    admin = await prisma.user.update({ where: { id: admin.id }, data: {
      email, firstName, lastName, active: true,
      ...(passwordChanged ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      ...(passwordChanged ? { sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } } } : {}),
    } });
  }

  const demoRepEmail = "demo.sales@autobridge.test";
  const demoRep = await prisma.user.upsert({
    where: { email: demoRepEmail },
    update: { firstName: "Demo", lastName: "Sales Rep", active: true },
    create: { email: demoRepEmail, firstName: "Demo", lastName: "Sales Rep", passwordHash: await bcrypt.hash(password, 12), role: "SALES_REP" },
  });

  for (const client of clients) {
    const exists = await prisma.client.findFirst({ where: { businessName: client.businessName } });
    if (!exists) await prisma.client.create({ data: { ...client, ownerId: client.businessName === "Highland Fleet Workshop" ? demoRep.id : admin.id } });
  }
  for (const [name, subgroups] of Object.entries(productGroups)) {
    const group = await prisma.productGroup.upsert({ where: { name }, update: {}, create: { name } });
    for (const subgroupName of subgroups) {
      await prisma.productSubgroup.upsert({
        where: { productGroupId_name: { productGroupId: group.id, name: subgroupName } },
        update: {},
        create: { productGroupId: group.id, name: subgroupName },
      });
    }
  }

  const seededClients = new Map((await prisma.client.findMany({
    where: { businessName: { in: clients.map((client) => client.businessName) } },
  })).map((client) => [client.businessName, client]));
  const subgroupByName = new Map((await prisma.productSubgroup.findMany()).map((subgroup) => [subgroup.name, subgroup]));

  const contactData = [
    { client: "Metro Auto Parts", firstName: "James", lastName: "Mwangi", title: "Procurement Manager", email: "james.mwangi@example.test", phone: "+254700100101", isPrimary: true },
    { client: "Coast Fleet Services", firstName: "Amina", lastName: "Hassan", title: "Fleet Manager", email: "amina.hassan@example.test", phone: "+254700100102", isPrimary: true },
    { client: "Lakeside Motors", firstName: "Brian", lastName: "Otieno", title: "Workshop Manager", email: "brian.otieno@example.test", phone: "+254700100103", isPrimary: true },
    { client: "Eastern Auto Distributors", firstName: "Faith", lastName: "Mutiso", title: "Purchasing Lead", email: "faith.mutiso@example.test", phone: "+254700100104", isPrimary: true },
    { client: "Savannah Fleet Logistics", firstName: "Peter", lastName: "Kariuki", title: "Operations Manager", email: "peter.kariuki@example.test", phone: "+254700100105", isPrimary: true },
    { client: "Highland Fleet Workshop", firstName: "Lucy", lastName: "Wanjiru", title: "Workshop Director", email: "lucy.wanjiru@example.test", phone: "+254700100106", isPrimary: true },
  ];
  for (const contact of contactData) {
    const client = seededClients.get(contact.client)!;
    const exists = await prisma.contact.findFirst({ where: { clientId: client.id, email: contact.email } });
    if (!exists) await prisma.contact.create({ data: {
      clientId: client.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      isPrimary: contact.isPrimary,
    } });
  }

  const opportunityData = [
    { client: "Metro Auto Parts", subgroup: "Replacement Parts", title: "Quarterly replacement parts order", estimatedAmount: "480000.00", routeToMarket: "RESELLER" as const, stage: "QUALIFYING" as const, estimatedCloseAt: new Date("2026-11-14T09:00:00.000Z") },
    { client: "Coast Fleet Services", subgroup: "Batteries & Accessories", title: "Fleet battery replacement", estimatedAmount: "1250000.00", routeToMarket: "FIELDS_SALES" as const, stage: "PROPOSAL" as const, estimatedCloseAt: new Date("2026-11-28T09:00:00.000Z") },
    { client: "Rift Valley Garage", subgroup: "Garage & Car Care", title: "Workshop care supplies", estimatedAmount: "320000.00", routeToMarket: "RESELLER" as const, stage: "NEW" as const, estimatedCloseAt: new Date("2026-12-05T09:00:00.000Z") },
    { client: "Savannah Fleet Logistics", subgroup: "Tires & Wheels", title: "Commercial fleet tyre programme", estimatedAmount: "2100000.00", routeToMarket: "FIELDS_SALES" as const, stage: "NEGOTIATION" as const, estimatedCloseAt: new Date("2026-11-07T09:00:00.000Z") },
  ];
  const seededOpportunities = new Map<string, { id: number; clientId: number; ownerId: number }>();
  for (const item of opportunityData) {
    const client = seededClients.get(item.client)!;
    const existing = await prisma.opportunity.findFirst({ where: { clientId: client.id, title: item.title }, select: { id: true, clientId: true, ownerId: true } });
    const opportunity = existing ?? await prisma.opportunity.create({ data: {
      clientId: client.id,
      ownerId: client.ownerId,
      productSubgroupId: subgroupByName.get(item.subgroup)!.id,
      title: item.title,
      estimatedAmount: item.estimatedAmount,
      currency: "KES",
      routeToMarket: item.routeToMarket,
      estimatedCloseAt: item.estimatedCloseAt,
    }, select: { id: true, clientId: true, ownerId: true } });
    if (!existing && item.stage !== "NEW") await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: item.stage } });
    seededOpportunities.set(item.title, opportunity);
  }

  const historicalOpportunityData = [
    { client: "Metro Auto Parts", subgroup: "Replacement Parts", title: "Demo 2025 replacement parts agreement", estimatedAmount: "820000.00", confirmedAmount: "780000.00", currency: "KES" as const, routeToMarket: "RESELLER" as const, outcome: "WON" as const, outcomeAt: new Date("2025-08-15T09:00:00.000Z") },
    { client: "Eastern Auto Distributors", subgroup: "Car Electronics", title: "Demo 2026 electronics distribution order", estimatedAmount: "14500.00", confirmedAmount: "12500.00", currency: "USD" as const, routeToMarket: "FIELDS_SALES" as const, outcome: "WON" as const, outcomeAt: new Date("2026-03-12T09:00:00.000Z") },
    { client: "Lakeside Motors", subgroup: "Garage & Car Care", title: "Demo 2025 workshop equipment proposal", estimatedAmount: "640000.00", currency: "KES" as const, routeToMarket: "FIELDS_SALES" as const, outcome: "LOST" as const, outcomeAt: new Date("2025-12-04T09:00:00.000Z") },
    { client: "Highland Fleet Workshop", subgroup: "Batteries & Accessories", title: "Demo highland fleet battery order", estimatedAmount: "960000.00", confirmedAmount: "910000.00", currency: "KES" as const, routeToMarket: "FIELDS_SALES" as const, outcome: "WON" as const, outcomeAt: new Date("2026-06-20T09:00:00.000Z") },
  ];
  for (const item of historicalOpportunityData) {
    const client = seededClients.get(item.client)!;
    const exists = await prisma.opportunity.findFirst({ where: { clientId: client.id, title: item.title } });
    if (exists) continue;
    const confirmedAt = item.outcomeAt;
    const conversion = item.outcome === "WON" ? convertMoneyToUsd({
      amount: item.confirmedAmount!,
      currency: item.currency,
      ...(item.currency === "KES" ? { rate: ILLUSTRATIVE_USD_KES_RATE } : {}),
      convertedAt: confirmedAt,
    }) : null;
    const opportunity = await prisma.opportunity.create({ data: {
      clientId: client.id,
      ownerId: client.ownerId,
      productSubgroupId: subgroupByName.get(item.subgroup)!.id,
      title: item.title,
      estimatedAmount: item.estimatedAmount,
      currency: item.currency,
      routeToMarket: item.routeToMarket,
    } });
    await prisma.opportunity.update({ where: { id: opportunity.id }, data: {
      stage: "CLOSED",
      outcome: item.outcome,
      outcomeAt: item.outcomeAt,
      ...(conversion ? {
        confirmedAmount: conversion.originalAmount,
        confirmedCurrency: conversion.originalCurrency,
        confirmedAmountUsd: conversion.modelReadyAmountUsd,
        confirmedQuoteUnitsPerUsd: conversion.quoteUnitsPerUsd,
        confirmedRateSource: conversion.rateSource,
        confirmedRateObservedAt: new Date(conversion.rateObservedAt),
        confirmedAt,
      } : {}),
    } });
  }

  const coverageStart = new Date("2024-10-21T00:00:00.000Z");
  const coverageEnd = new Date("2026-10-22T00:00:00.000Z");
  const coverageSource = "Synthetic development verification of complete AutoBridge demo records";
  for (const clientName of ["Metro Auto Parts", "Lakeside Motors", "Highland Fleet Workshop"]) {
    const client = seededClients.get(clientName)!;
    const existing = await prisma.clientRevenueSummary.findFirst({ where: { clientId: client.id, coverageStart, coverageEnd, evidenceSource: coverageSource } });
    if (existing) continue;
    const wins = await prisma.opportunity.findMany({ where: { clientId: client.id, outcome: "WON", outcomeAt: { gte: coverageStart, lt: coverageEnd }, confirmedAmountUsd: { not: null } }, select: { confirmedAmountUsd: true } });
    const amount = wins.reduce((total, opportunity) => total.plus(opportunity.confirmedAmountUsd ?? 0), new Prisma.Decimal(0));
    await prisma.clientRevenueSummary.create({ data: { clientId: client.id, amount, currency: "USD", coverageStart, coverageEnd, evidenceSource: coverageSource, verifiedAt: coverageEnd, verifiedById: admin.id } });
  }

  const interactionData = [
    { opportunity: "Quarterly replacement parts order", interactionType: "CALL", notes: "Confirmed the required replacement-parts categories and expected order timing.", occurredAt: new Date("2026-10-19T07:30:00.000Z") },
    { opportunity: "Fleet battery replacement", interactionType: "SITE_VISIT", notes: "Reviewed fleet battery specifications with the maintenance team.", occurredAt: new Date("2026-10-20T09:00:00.000Z") },
    { opportunity: "Workshop care supplies", interactionType: "EMAIL", notes: "Sent the initial product list and requested monthly usage estimates.", occurredAt: new Date("2026-10-20T12:15:00.000Z") },
    { opportunity: "Commercial fleet tyre programme", interactionType: "MEETING", notes: "Discussed delivery phases, tyre sizes and procurement approval steps.", occurredAt: new Date("2026-10-21T06:45:00.000Z") },
  ];
  for (const item of interactionData) {
    const opportunity = seededOpportunities.get(item.opportunity)!;
    const exists = await prisma.interaction.findFirst({ where: { opportunityId: opportunity.id, interactionType: item.interactionType, occurredAt: item.occurredAt } });
    if (!exists) await prisma.interaction.create({ data: { clientId: opportunity.clientId, opportunityId: opportunity.id, userId: opportunity.ownerId, interactionType: item.interactionType, notes: item.notes, occurredAt: item.occurredAt } });
  }

  const followUpData = [
    { opportunity: "Quarterly replacement parts order", title: "Confirm final parts quantities", channel: "CALL", dueAt: new Date("2026-10-23T07:00:00.000Z") },
    { opportunity: "Fleet battery replacement", title: "Send revised battery proposal", channel: "EMAIL", dueAt: new Date("2026-10-24T08:30:00.000Z") },
    { opportunity: "Workshop care supplies", title: "Review monthly usage estimates", channel: "CALL", dueAt: new Date("2026-10-27T07:30:00.000Z") },
    { opportunity: "Commercial fleet tyre programme", title: "Confirm procurement review meeting", channel: "MEETING", dueAt: new Date("2026-10-29T06:00:00.000Z") },
  ];
  for (const item of followUpData) {
    const opportunity = seededOpportunities.get(item.opportunity)!;
    const exists = await prisma.followUp.findFirst({ where: { opportunityId: opportunity.id, title: item.title } });
    if (exists) await prisma.followUp.update({ where: { id: exists.id }, data: { channel: item.channel } });
    else await prisma.followUp.create({ data: { clientId: opportunity.clientId, opportunityId: opportunity.id, ownerId: opportunity.ownerId, title: item.title, channel: item.channel, dueAt: item.dueAt } });
  }

  console.log("Synthetic development users, clients, sales history, products, activities, and revenue coverage ready");
} finally {
  await prisma.$disconnect();
}
