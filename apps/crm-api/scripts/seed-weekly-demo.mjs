import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../dist/src/client.js";
import { OpportunityScoringService } from "../dist/src/services/opportunityScoringService.js";
import { OpportunityService } from "../dist/src/services/opportunityService.js";
import { ClientSalesHistoryService } from "../dist/src/services/clientSalesHistoryService.js";
import { WeeklyAllocationService } from "../dist/src/services/weeklyAllocationService.js";

const databaseUrl = process.env.DATABASE_URL_ADMIN;
const database = databaseUrl ? new URL(databaseUrl) : null;
if (
  process.env.NODE_ENV !== "development" ||
  !database ||
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  !/(^|[_-])(dev|development|test)($|[_-])/i.test(database.pathname.slice(1))
)
  throw new Error(
    "Weekly demo seed requires a local development database with dev or test in its name",
  );
if (!process.env.ML_API_URL || !process.env.ML_API_TOKEN)
  throw new Error(
    "Start the ML service and configure ML_API_URL and ML_API_TOKEN before seeding",
  );
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw new Error(
    "Configure ADMIN_EMAIL and ADMIN_PASSWORD for the local development admin",
  );

const marker = "AUTOBRIDGE_WEEKLY_DEMO";
const repEmail = "weekly.planner@autobridge.local";
const clientNames = [
  "Demo Metro Fleet",
  "Demo Garage Network",
  "Demo Service Vans",
  "Demo County Parts",
  "Demo Airport Shuttle",
  "Demo Coastal Workshop",
  "Demo City Delivery",
  "Demo Highway Spares",
  "Demo Community Garage",
  "Demo Regional Transport",
];
const opportunityData = [
  {
    title: "Demo: Fleet battery supply",
    client: clientNames[0],
    quantity: "6",
    interactionType: "CALL",
  },
  {
    title: "Demo: Garage battery replenishment",
    client: clientNames[1],
    quantity: "4",
    interactionType: "EMAIL",
  },
  {
    title: "Demo: Service van battery replenishment",
    client: clientNames[2],
    quantity: "4",
    interactionType: "EMAIL",
  },
  {
    title: "Demo: Workshop battery inspection",
    client: clientNames[0],
    quantity: "3",
    interactionType: "CALL",
  },
  {
    title: "Demo: Fleet battery review",
    client: clientNames[1],
    quantity: "3",
    interactionType: "CALL",
  },
  ...[
    [
      "County service filters",
      3,
      "AB-RPL-001",
      "80",
      "QUALIFYING",
      "FIELDS_SALES",
      "CALL",
    ],
    [
      "Shuttle cooling system",
      4,
      "AB-GCC-001",
      "18",
      "PROPOSAL",
      "RESELLER",
      "EMAIL",
    ],
    [
      "Coastal tyre supply",
      5,
      "AB-TYR-001",
      "12",
      "NEGOTIATION",
      "FIELDS_SALES",
      "MEETING",
    ],
    [
      "City delivery interiors",
      6,
      "AB-INT-001",
      "24",
      "NEW",
      "TELECOVERAGE",
      "EMAIL",
    ],
    [
      "Highway replacement parts",
      7,
      "AB-RPL-004",
      "16",
      "QUALIFYING",
      "RESELLER",
      "CALL",
    ],
    [
      "Community garage batteries",
      8,
      "AB-BAT-002",
      "10",
      "PROPOSAL",
      "TELESALES",
      null,
    ],
    [
      "Regional vehicle accessories",
      9,
      "AB-EXT-001",
      "30",
      "NEGOTIATION",
      "FIELDS_SALES",
      "MEETING",
    ],
    [
      "County motorcycle maintenance",
      3,
      "AB-MCY-001",
      "60",
      "NEW",
      "RESELLER",
      null,
    ],
    [
      "Shuttle cabin equipment",
      4,
      "AB-CEL-001",
      "25",
      "QUALIFYING",
      "TELECOVERAGE",
      "EMAIL",
    ],
    [
      "Coastal recovery equipment",
      5,
      "AB-TOW-001",
      "15",
      "PROPOSAL",
      "FIELDS_SALES",
      "CALL",
    ],
    [
      "City van service parts",
      6,
      "AB-SRV-001",
      "8",
      "NEGOTIATION",
      "RESELLER",
      "MEETING",
    ],
    ["Highway fleet tyres", 7, "AB-TYR-002", "16", "NEW", "TELESALES", null],
    [
      "Community lighting upgrades",
      8,
      "AB-EXT-002",
      "35",
      "QUALIFYING",
      "TELECOVERAGE",
      "EMAIL",
    ],
    [
      "Regional battery replenishment",
      9,
      "AB-BAT-003",
      "20",
      "PROPOSAL",
      "RESELLER",
      "CALL",
    ],
    [
      "County garage tools",
      3,
      "AB-RPL-005",
      "10",
      "NEGOTIATION",
      "FIELDS_SALES",
      "MEETING",
    ],
  ].map(
    ([name, clientIndex, sku, quantity, stage, route, interactionType]) => ({
      title: `Demo: ${name}`,
      client: clientNames[clientIndex],
      sku,
      quantity,
      stage,
      route,
      interactionType,
    }),
  ),
];

try {
  const admin = await prisma.user.findUnique({
    where: { email: process.env.ADMIN_EMAIL.trim().toLowerCase() },
  });
  assert.ok(
    admin?.role === "ADMIN" &&
      (await bcrypt.compare(process.env.ADMIN_PASSWORD, admin.passwordHash)),
    "ADMIN_PASSWORD must match the local administrator account",
  );
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP", active: true, approvedAt: { not: null } },
    orderBy: { id: "asc" },
  });
  assert.ok(reps.length, "No active approved sales representatives found");
  const products = await prisma.product.findMany({ where: { active: true } });
  const productBySku = new Map(products.map((item) => [item.sku, item]));
  assert.ok(
    opportunityData.every((item) => productBySku.has(item.sku ?? "AB-BAT-001")),
    "Run the base development seed to create the automotive catalogue products",
  );

  const scoring = new OpportunityScoringService();
  const opportunityService = new OpportunityService();
  const salesHistory = new ClientSalesHistoryService();
  const allocation = new WeeklyAllocationService();
  const now = new Date();
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weekStart = monday.toISOString().slice(0, 10);
  for (const rep of reps) {
    const label = rep.email === repEmail ? "" : ` [rep ${rep.id}]`;
    const clients = new Map();
    for (const [clientIndex, businessName] of clientNames.entries()) {
      const namedClient = `${businessName}${label}`;
      const matches = await prisma.client.findMany({
        where: { businessName: namedClient },
      });
      assert.ok(
        matches.length <= 1 &&
          (!matches[0] ||
            (matches[0].ownerId === rep.id && !matches[0].deletedAt)),
        `Conflicting demo client: ${namedClient}`,
      );
      const client =
        matches[0] ??
        (await prisma.client.create({
          data: {
            businessName: namedClient,
            countyName: "Nairobi",
            locationAddress: "Development demo",
            shortHistory:
              "Illustrative automotive sales account for weekly planning.",
            ownerId: rep.id,
          },
        }));
      clients.set(businessName, client);
      const contactEmail = `demo.r${rep.id}.c${clientIndex + 1}@autobridge.local`;
      const contact = await prisma.contact.findFirst({
        where: { clientId: client.id, email: contactEmail },
      });
      if (!contact)
        await prisma.contact.create({
          data: {
            clientId: client.id,
            firstName: "Demo",
            lastName: `Contact ${clientIndex + 1}`,
            email: contactEmail,
            title: "Purchasing contact",
            isPrimary: true,
          },
        });
      if ([3, 6].includes(clientIndex)) {
        const evidenceSource = `${marker}:demo no-purchases declaration`;
        const coverage = await prisma.clientRevenueSummary.findFirst({
          where: { clientId: client.id, evidenceSource },
        });
        const coverageEnd = new Date(now.getTime() + 31 * 86_400_000);
        if (!coverage)
          await prisma.clientRevenueSummary.create({
            data: {
              clientId: client.id,
              amount: new Prisma.Decimal(0),
              currency: "USD",
              coverageStart: new Date(
                Date.UTC(
                  now.getUTCFullYear() - 3,
                  now.getUTCMonth(),
                  now.getUTCDate(),
                ),
              ),
              coverageEnd,
              evidenceSource,
              declaration: "NO",
              complete: true,
              verifiedAt: now,
              verifiedById: rep.id,
            },
          });
        else if (coverage.coverageEnd < coverageEnd)
          await prisma.clientRevenueSummary.update({
            where: { id: coverage.id },
            data: { coverageEnd },
          });
      }
    }

    const historicClients = await prisma.client.findMany({
      where: {
        ownerId: rep.id,
        deletedAt: null,
        businessName: {
          in: [
            "Metro Auto Parts",
            "Eastern Auto Distributors",
            "Highland Fleet Workshop",
            "Savannah Fleet Logistics",
          ],
        },
      },
    });
    const historicEvidence = await salesHistory.evidenceForClients(
      { id: rep.id, role: "SALES_REP" },
      historicClients.map((item) => item.id),
      now,
    );
    const verifiedClient = historicClients.find(
      (item) => historicEvidence.get(item.id)?.state === "VERIFIED_COMPLETE",
    );
    const demoItems = [...opportunityData];
    if (verifiedClient) {
      clients.set(verifiedClient.businessName, verifiedClient);
      demoItems.push({
        title: "Demo: Repeat-purchase service parts",
        client: verifiedClient.businessName,
        sku: "AB-RPL-001",
        quantity: "50",
        stage: "QUALIFYING",
        route: "FIELDS_SALES",
        interactionType: "CALL",
      });
    }
    const opportunities = [];
    for (const [index, item] of demoItems.entries()) {
      const client = clients.get(item.client);
      const title = `${item.title}${label}`;
      const product = productBySku.get(item.sku ?? "AB-BAT-001");
      const route = item.route ?? "TELECOVERAGE";
      const amount = product.defaultSellingPrice
        .mul(item.quantity)
        .toDecimalPlaces(2);
      const matches = await prisma.opportunity.findMany({ where: { title } });
      assert.ok(
        matches.length <= 1 &&
          (!matches[0] ||
            (matches[0].clientId === client.id &&
              matches[0].ownerId === rep.id &&
              matches[0].outcome === null &&
              matches[0].productSubgroupId === product.productSubgroupId &&
              matches[0].routeToMarket === route)),
        `Conflicting demo opportunity: ${item.title}`,
      );
      const opportunity =
        matches[0] ??
        (await prisma.opportunity.create({
          data: {
            clientId: client.id,
            ownerId: rep.id,
            productSubgroupId: product.productSubgroupId,
            title,
            estimatedAmount: amount,
            currency: "KES",
            routeToMarket: route,
            estimatedCloseAt: new Date(now.getTime() + 21 * 86_400_000),
            ...([10, 12, 14].includes(index)
              ? { createdAt: new Date(now.getTime() - 45 * 86_400_000) }
              : {}),
          },
        }));
      if (item.stage && opportunity.stage !== item.stage) {
        assert.equal(opportunity.stage, "NEW", `Unexpected stage for ${title}`);
        await opportunityService.transition(
          { id: rep.id, role: "SALES_REP" },
          opportunity.id,
          { stage: item.stage },
        );
      }
      const notes = `${marker}:${title}`;
      if (item.interactionType) {
        const existingInteraction = await prisma.interaction.findFirst({
          where: { opportunityId: opportunity.id, notes },
        });
        if (existingInteraction)
          await prisma.interaction.update({
            where: { id: existingInteraction.id },
            data: { occurredAt: now },
          });
        else
          await prisma.interaction.create({
            data: {
              clientId: client.id,
              opportunityId: opportunity.id,
              userId: rep.id,
              interactionType: item.interactionType,
              notes,
              occurredAt: now,
            },
          });
      }
      const quoteNumber = `ABQ-DEMO-${rep.id}-${index + 1}`;
      const existingQuotation = await prisma.quotation.findFirst({
        where: { opportunityId: opportunity.id },
      });
      if (existingQuotation) {
        assert.equal(existingQuotation.clientId, client.id);
      } else if (!opportunity.estimatedAmount.equals(amount)) {
        console.log(`Preserving edited demo amount without creating a quotation for ${title}`);
      } else {
        const numberInUse = await prisma.quotation.findUnique({
          where: { quoteNumber_version: { quoteNumber, version: 1 } },
        });
        assert.equal(numberInUse, null, `Conflicting demo quotation: ${quoteNumber}`);
        await prisma.quotation.create({
          data: {
            quoteNumber,
            version: 1,
            opportunityId: opportunity.id,
            clientId: client.id,
            createdById: rep.id,
            status: "DRAFT",
            current: true,
            currency: "KES",
            validUntil: new Date(now.getTime() + 30 * 86_400_000),
            subtotal: amount,
            discountPercent: new Prisma.Decimal(0),
            discountAmount: new Prisma.Decimal(0),
            totalAmount: amount,
            clientNameSnapshot: client.businessName,
            clientAddressSnapshot: `${client.locationAddress}, ${client.countyName}`,
            notes:
              "Development demonstration quotation; confirm prices before sending.",
            items: {
              create: [
                {
                  productId: product.id,
                  skuSnapshot: product.sku,
                  productNameSnapshot: product.name,
                  brandSnapshot: product.brand,
                  descriptionSnapshot: product.description,
                  unitSnapshot: product.unitOfMeasure,
                  quantity: new Prisma.Decimal(item.quantity),
                  unitPrice: product.defaultSellingPrice,
                  lineTotal: amount,
                },
              ],
            },
          },
        });
      }
      opportunities.push(opportunity);
    }

    const scheduledDueAt = new Date(
      Math.min(
        now.getTime() + 86_400_000,
        monday.getTime() + 7 * 86_400_000 - 1000,
      ),
    );
    for (const [index, dueAt] of [
      scheduledDueAt,
      new Date(now.getTime() - 86_400_000),
    ].entries()) {
      const opportunity = opportunities[index + 3];
      const title = `${index === 0 ? "Demo: Confirm workshop battery inspection" : "Demo: Review fleet battery requirements"}${label}`;
      const oldTitle = `${marker}:${index === 0 ? "scheduled" : "overdue"}`;
      const existing = await prisma.followUp.findFirst({
        where: {
          opportunityId: opportunity.id,
          title: { in: [title, oldTitle] },
        },
      });
      if (existing && !existing.completedAt)
        await prisma.followUp.update({
          where: { id: existing.id },
          data: { title, dueAt },
        });
      else if (!existing)
        await prisma.followUp.create({
          data: {
            clientId: opportunity.clientId,
            opportunityId: opportunity.id,
            ownerId: rep.id,
            title,
            channel: "CALL",
            dueAt,
          },
        });
    }
    for (const [index, channel, isOverdue] of [
      [7, "MEETING", false],
      [16, "EMAIL", false],
      [9, "EMAIL", true],
      [13, "CALL", true],
    ]) {
      const opportunity = opportunities[index];
      const title = `${marker}:${index}:${label || rep.id}`;
      const dueAt = isOverdue
        ? new Date(now.getTime() - 86_400_000)
        : scheduledDueAt;
      const existing = await prisma.followUp.findFirst({
        where: { opportunityId: opportunity.id, title },
      });
      if (existing && !existing.completedAt)
        await prisma.followUp.update({
          where: { id: existing.id },
          data: { dueAt },
        });
      else if (!existing)
        await prisma.followUp.create({
          data: {
            clientId: opportunity.clientId,
            opportunityId: opportunity.id,
            ownerId: rep.id,
            title,
            channel,
            dueAt,
          },
        });
    }

    const counts = { PRIMARY: 0, LIMITED_HISTORY: 0, reused: 0 };
    for (const opportunity of opportunities) {
      const prediction = await scoring.score(
        { id: rep.id, role: "SALES_REP" },
        opportunity.id,
      );
      assert.ok(
        prediction?.explanation?.status === "available" &&
          prediction.modelVersion === "automotive_v1",
        `Genuine model prediction required for ${opportunity.title}`,
      );
      counts[prediction.modelVariant] += 1;
      if (prediction.reused) counts.reused += 1;
    }
    const preview = await allocation.plan(
      { id: rep.id, role: "SALES_REP" },
      weekStart,
    );
    const completedMinutes = preview.completedMinutes;
    if (!(await allocation.capacity(rep.id, weekStart)))
      await allocation.saveCapacity(rep.id, weekStart, completedMinutes + 240);
    const plan = await allocation.plan({ id: rep.id, role: "SALES_REP" }, weekStart);
    console.log(
      `${rep.email}: 10 marked demo clients, ${opportunities.length} demo opportunities, ${plan.candidates.length} candidates, predictions PRIMARY=${counts.PRIMARY} LIMITED_HISTORY=${counts.LIMITED_HISTORY} reused=${counts.reused}`,
    );
  }
  console.log(
    `Weekly demo ready for ${weekStart}: ${reps.length} existing active representatives; at least 20 opportunities per representative.`,
  );
} finally {
  await prisma.$disconnect();
}
