import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/client.js";
import { ClientSalesHistoryService } from "../dist/src/services/clientSalesHistoryService.js";

const openTitles = [
  "Quarterly replacement parts order",
  "Fleet battery replacement",
  "Workshop care supplies",
  "Commercial fleet tyre programme",
  "Dealer dash camera restock",
  "Workshop interior accessories order",
  "Motorcycle drivetrain spares order",
  "Field service shelter equipment",
  "Retail tyre replenishment",
  "Garage battery inventory",
  "Fleet exterior protection pack",
  "Reseller towing rope order",
];
const historicalTitles = [
  "2025 replacement parts agreement",
  "2026 electronics distribution order",
  "2025 workshop equipment proposal",
  "Highland fleet battery order",
  "Fictional October dealer electronics order",
  "Fictional October tyre proposal",
  "Fictional coastal service shelter proposal",
  "Fictional fleet tyre supply",
  "Fictional regional fleet battery framework",
];

try {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL?.trim().toLowerCase() } });
  const reps = await prisma.user.findMany({ where: { email: { in: ["samuel@autobridge.local", "grace@autobridge.local"] } } });
  assert.equal(reps.length, 2);
  assert.ok(reps.every((rep) => rep.role === "SALES_REP" && rep.active));

  const sourcedProducts = await prisma.product.findMany({
    where: { sku: { in: ["AB-MCY-001", "AB-MCY-002", "AB-SRV-001", "AB-SRV-002"] } },
    include: { productSubgroup: true },
  });
  assert.equal(sourcedProducts.length, 4);
  assert.deepEqual(new Set(sourcedProducts.map((product) => product.productSubgroup.name)), new Set(["Motorcycle Parts", "Shelters & RV"]));
  assert.ok(sourcedProducts.every((product) => product.currency === "KES" && product.priceClassification === "PUBLIC_RETAIL_REFERENCE" && product.priceSourceUrl.startsWith("https://")));

  const open = await prisma.opportunity.findMany({
    where: { title: { in: openTitles } },
    include: { quotations: { where: { current: true }, include: { items: { include: { product: true } } } } },
  });
  assert.equal(open.length, 12);
  assert.ok(open.every((opportunity) => opportunity.outcome === null && opportunity.stage !== "CLOSED"));
  assert.equal(new Set(open.map((opportunity) => opportunity.ownerId)).size, 2);
  for (const opportunity of open) {
    assert.equal(opportunity.quotations.length, 1);
    assert.ok(opportunity.quotations[0].items.length > 0);
    assert.ok(
      opportunity.estimatedAmount.equals(opportunity.quotations[0].totalAmount),
      `${opportunity.title}: opportunity ${opportunity.estimatedAmount} != quotation ${opportunity.quotations[0].totalAmount}`,
    );
    assert.ok(opportunity.quotations[0].items.some((item) => item.product.productSubgroupId === opportunity.productSubgroupId));
  }

  const historical = await prisma.opportunity.findMany({ where: { title: { in: historicalTitles } } });
  assert.equal(historical.length, historicalTitles.length);
  assert.ok(historical.some((opportunity) => opportunity.outcome === "WON"));
  assert.ok(historical.some((opportunity) => opportunity.outcome === "LOST"));
  assert.ok(historical.every((opportunity) => opportunity.outcome === "WON" ? opportunity.confirmedAmount !== null : opportunity.confirmedAmount === null));

  const evidence = await new ClientSalesHistoryService().evidenceForClients(admin, open.map((opportunity) => opportunity.clientId), new Date());
  const variants = open.map((opportunity) => evidence.get(opportunity.clientId)?.state === "UNKNOWN" ? "LIMITED_HISTORY" : "PRIMARY");
  assert.equal(variants.filter((variant) => variant === "PRIMARY").length, 6, JSON.stringify([...evidence.entries()].map(([id, item]) => [id, item.state, item.ibmRevenueCode, item.reviewReason])));
  assert.equal(variants.filter((variant) => variant === "LIMITED_HISTORY").length, 6);
  assert.ok(new Set([...evidence.values()].map((item) => item.ibmRevenueCode).filter((code) => code !== null)).size >= 4);

  console.log("PASS: 2 sales reps, 4 sourced products, 12 open opportunities with current quotations, 9 historical outcomes, and 6 primary/6 limited-history scenarios");
} finally {
  await prisma.$disconnect();
}
