import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/client.js";
import { WeeklyAllocationService } from "../dist/src/services/weeklyAllocationService.js";

const database = process.env.DATABASE_URL_ADMIN ? new URL(process.env.DATABASE_URL_ADMIN) : null;
assert.ok(process.env.NODE_ENV === "development" && database &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  /(^|[_-])(dev|development|test)($|[_-])/i.test(database.pathname.slice(1)),
  "Use a local development database");

const now = new Date();
const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const weekStart = monday.toISOString().slice(0, 10);
const dueAt = new Date(Math.min(now.getTime() + 60_000, monday.getTime() + 7 * 86_400_000 - 1000));
const service = new WeeklyAllocationService();
const temporaryIds = [];
try {
  const rep = await prisma.user.findUniqueOrThrow({ where: { email: "weekly.planner@autobridge.local" } });
  const opportunity = await prisma.opportunity.findFirstOrThrow({ where: {
    ownerId: rep.id, title: { startsWith: "Demo: No-action follow-up" }, outcome: null,
  } });
  const actor = { id: rep.id, role: "SALES_REP" };
  const before = await service.plan(actor, weekStart);
  assert.ok(!before.candidates.some((item) => item.opportunityId === opportunity.id));
  for (const [index, minutes] of [15, 30].entries()) {
    const followUp = await prisma.followUp.create({ data: {
      clientId: opportunity.clientId, opportunityId: opportunity.id, ownerId: rep.id,
      title: `TEMP_VERIFY_WEEKLY_CANDIDATE_${index}`, channel: "EMAIL", estimatedMinutes: minutes, dueAt,
    } });
    temporaryIds.push(followUp.id);
  }
  const after = await service.plan(actor, weekStart);
  assert.ok(temporaryIds.every((id) => after.candidates.some((item) => item.id === id)));
  assert.ok(after.recommended.filter((item) => temporaryIds.includes(item.id)).length <= 1);
  assert.ok(after.recommended.every((item) => after.candidates.some((candidate) => candidate.id === item.id)));
  console.log("PASS: both follow-ups enter weekly candidates without double-counting opportunity value; temporary records removed");
} finally {
  if (temporaryIds.length) await prisma.followUp.deleteMany({ where: { id: { in: temporaryIds } } });
  await prisma.$disconnect();
}
