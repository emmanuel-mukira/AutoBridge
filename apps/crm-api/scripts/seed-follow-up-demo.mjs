import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/client.js";
import { OpportunityService } from "../dist/src/services/opportunityService.js";
import { OpportunityScoringService } from "../dist/src/services/opportunityScoringService.js";

const database = process.env.DATABASE_URL_ADMIN ? new URL(process.env.DATABASE_URL_ADMIN) : null;
if (process.env.NODE_ENV !== "development" || !database ||
    !["localhost", "127.0.0.1"].includes(database.hostname) ||
    !/(^|[_-])(dev|development|test)($|[_-])/i.test(database.pathname.slice(1)))
  throw new Error("Follow-up demo seed requires a local development or test database");
if (!process.env.ML_API_URL || !process.env.ML_API_TOKEN)
  throw new Error("Start the ML service and configure ML_API_URL and ML_API_TOKEN");

// The established demo seed supplies clients, contacts, catalogue quotations and genuine predictions.
await import("./seed-weekly-demo.mjs");

const marker = "AUTOBRIDGE_FOLLOW_UP_DEMO";
const now = new Date();
const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const at = (day, hour = 10) => new Date(monday.getTime() + day * 86_400_000 + hour * 3_600_000);
const opportunityService = new OpportunityService();
const scoring = new OpportunityScoringService();

async function addFollowUp(rep, opportunity, key, channel, dueAt, estimatedMinutes = null, appointmentConfirmed = false, completedAt = null) {
  const title = `${marker}:${key}: ${opportunity.title}`;
  const existing = await prisma.followUp.findFirst({ where: { opportunityId: opportunity.id, title } });
  if (existing) {
    assert.equal(existing.ownerId, rep.id);
    return existing;
  }
  return prisma.followUp.create({ data: {
    clientId: opportunity.clientId, opportunityId: opportunity.id, ownerId: rep.id,
    title, channel, dueAt, estimatedMinutes, appointmentConfirmed, completedAt,
  } });
}

try {
  const reps = await prisma.user.findMany({ where: {
    role: "SALES_REP", active: true, approvedAt: { not: null },
  }, orderBy: { id: "asc" } });
  const product = await prisma.product.findUnique({ where: { sku: "AB-BAT-001" } });
  assert.ok(product?.active, "Run the automotive catalogue seed first");
  for (const rep of reps) {
    const actor = { id: rep.id, role: "SALES_REP" };
    const existing = await prisma.opportunity.findMany({
      where: { ownerId: rep.id, title: { startsWith: "Demo:" }, outcome: null },
      orderBy: { id: "asc" },
    });
    const base = existing.filter((item) => !item.title.includes("Unscored follow-up") &&
      !item.title.includes("Stale follow-up") && !item.title.includes("No-action follow-up"));
    assert.ok(base.length >= 20, "Base weekly demo opportunities missing");
    const firstClient = await prisma.client.findUniqueOrThrow({ where: { id: base[0].clientId } });
    for (const kind of ["Unscored", "Stale", "No-action"]) {
      const title = `Demo: ${kind} follow-up ${marker} rep ${rep.id}`;
      let opportunity = await prisma.opportunity.findFirst({ where: { ownerId: rep.id, title } });
      if (!opportunity) {
        opportunity = await opportunityService.create(actor, {
          clientId: firstClient.id, productSubgroupId: product.productSubgroupId,
          title, routeToMarket: "FIELDS_SALES",
          items: [{ productId: product.id, quantity: "2" }],
        });
        if (kind === "Stale") {
          const prediction = await scoring.score(actor, opportunity.id);
          assert.equal(prediction.modelVersion, "automotive_v1");
          opportunity = await opportunityService.update(actor, opportunity.id, { routeToMarket: "RESELLER" });
        } else if (kind === "No-action") {
          const prediction = await scoring.score(actor, opportunity.id);
          assert.equal(prediction.modelVersion, "automotive_v1");
        }
      }
      if (kind !== "No-action")
        await addFollowUp(rep, opportunity, kind.toLowerCase(), "CALL", at(4), 30);
    }
    for (let index = 0; index < 16; index++) {
      const opportunity = base[index];
      await addFollowUp(rep, opportunity, `flex-${index}`,
        index % 3 === 0 ? "EMAIL" : "CALL",
        index === 12 ? at(-1) : at(index % 2 ? 4 : 5),
        index % 4 === 0 ? 60 : index % 3 === 0 ? 15 : 30);
    }
    for (let index = 0; index < 4; index++)
      await addFollowUp(rep, base[index], `second-${index}`, "EMAIL", at(5), 15);
    await addFollowUp(rep, base[17], "fixed-meeting", "MEETING", at(5, 9), 60, true);
    await addFollowUp(rep, base[18], "fixed-visit", "SITE_VISIT", at(5, 13), 120, true);
    await addFollowUp(rep, base[19], "future", "EMAIL", at(9), 15);
    await addFollowUp(rep, base[0], "completed-current-week", "CALL", at(0), 30, false, now);
    await addFollowUp(rep, base[1], "completed-prior-due-week", "MEETING", at(-5), 60, true, now);
    const counts = await prisma.followUp.groupBy({
      by: ["completedAt"], where: { ownerId: rep.id, title: { startsWith: marker } }, _count: true,
    });
    console.log(`${rep.email}: ${base.length + 3} demo opportunities; ${counts.reduce((sum, row) => sum + row._count, 0)} marked follow-ups`);
  }
  console.log(`Follow-up demo ready for UTC week ${monday.toISOString().slice(0, 10)}`);
} finally {
  await prisma.$disconnect();
}
