import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const testStart = new Date(Date.now() - 1000).toISOString();
const created = { users: [], clients: [], opportunities: [], interactions: [], followUps: [] };
let catalogueProduct;

async function request(path, method = "GET", body, session) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(session ? { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { response, data: response.status === 204 ? null : await response.json() };
}

async function signIn(email, password) {
  const result = await request("/api/auth/login", "POST", { email, password });
  assert.equal(result.response.status, 200);
  return { cookie: result.response.headers.get("set-cookie").split(";")[0], csrfToken: result.data.csrfToken, user: result.data.user };
}

async function createRep(admin, name, password) {
  const result = await request("/api/auth/users", "POST", { email: `${name}-${suffix}@example.test`, password, firstName: name, lastName: "Analytics", role: "SALES_REP" }, admin);
  assert.equal(result.response.status, 201);
  created.users.push(result.data.user.id);
  return signIn(result.data.user.email, password);
}

async function createClient(session, businessName) {
  const result = await request("/api/clients", "POST", { businessName, countyName: "Nairobi", locationAddress: "Analytics Test Road" }, session);
  assert.equal(result.response.status, 201);
  created.clients.push(result.data.id);
  return result.data;
}

async function createOpportunity(session, clientId, input) {
  const result = await request("/api/opportunities", "POST", { clientId, title: `${input.title} ${suffix}`, routeToMarket: input.route, productSubgroupId: catalogueProduct.productSubgroupId, items: [{ productId: catalogueProduct.id, quantity: input.quantity ?? "1" }] }, session);
  assert.equal(result.response.status, 201);
  created.opportunities.push(result.data.id);
  return result.data;
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Development administrator credentials are required");
  assert.equal((await request("/api/analytics/overview")).response.status, 401);
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  assert.equal((await request("/api/analytics/overview?startDate=2026-10-02T00:00:00.000Z&endDate=2026-10-01T00:00:00.000Z", "GET", undefined, admin)).response.status, 400);

  const password = `${randomUUID()}-Test1!`;
  const rep = await createRep(admin, "Primary", password);
  const otherRep = await createRep(admin, "Secondary", password);
  const emptyRep = await createRep(admin, "Empty", password);
  const client = await createClient(rep, `Analytics Client ${suffix}`);
  const otherClient = await createClient(otherRep, `Other Analytics Client ${suffix}`);
  const emptyClient = await createClient(emptyRep, `Empty Analytics Client ${suffix}`);
  const products = await request("/api/opportunities/products", "GET", undefined, admin);
  const subgroup = products.data.productGroups[0].subgroups[0];
  catalogueProduct = (await request(`/api/products?productSubgroupId=${subgroup.id}`, "GET", undefined, admin)).data.products[0];

  const kesOpen = await createOpportunity(rep, client.id, { title: "KES open", amount: "129000", currency: "KES", route: "RESELLER", productSubgroupId: subgroup.id });
  const usdOpen = await createOpportunity(rep, client.id, { title: "USD open", amount: "1000", currency: "USD", route: "FIELDS_SALES", productSubgroupId: subgroup.id });
  const won = await createOpportunity(rep, client.id, { title: "Won", amount: "500", currency: "USD", route: "RESELLER", productSubgroupId: subgroup.id });
  assert.equal((await request(`/api/opportunities/${won.id}/stage`, "PATCH", {
    stage: "CLOSED",
    outcome: "WON",
    confirmedAmount: "500",
    confirmedCurrency: "USD",
  }, rep)).response.status, 200);
  const lost = await createOpportunity(otherRep, otherClient.id, { title: "Lost", amount: "900", currency: "USD", route: "TELESALES", productSubgroupId: subgroup.id });
  assert.equal((await request(`/api/opportunities/${lost.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "LOST" }, otherRep)).response.status, 200);
  await createOpportunity(emptyRep, emptyClient.id, { title: "Only open", amount: "100", currency: "USD", route: "OTHER", productSubgroupId: subgroup.id });

  const interaction = await request("/api/interactions", "POST", { clientId: client.id, opportunityId: kesOpen.id, interactionType: "CALL", notes: "Analytics verification", occurredAt: new Date().toISOString() }, rep);
  assert.equal(interaction.response.status, 201);
  created.interactions.push(interaction.data.id);
  for (const [title, dueAt] of [["Overdue analytics", new Date(Date.now() - 86_400_000)], ["Upcoming analytics", new Date(Date.now() + 86_400_000)], ["Completed analytics", new Date(Date.now() - 3_600_000)]]) {
    const result = await request("/api/follow-ups", "POST", { clientId: client.id, opportunityId: usdOpen.id, title, channel: "EMAIL", dueAt: dueAt.toISOString() }, rep);
    assert.equal(result.response.status, 201);
    created.followUps.push(result.data.id);
    if (title.startsWith("Completed")) assert.equal((await request(`/api/follow-ups/${result.data.id}/complete`, "PATCH", {}, rep)).response.status, 200);
  }

  const repOverview = await request(`/api/analytics/overview?ownerId=${rep.user.id}`, "GET", undefined, rep);
  assert.equal(repOverview.response.status, 200);
  assert.equal(repOverview.data.summary.totalOpportunities, 3);
  assert.equal(repOverview.data.summary.openOpportunities, 2);
  assert.equal(repOverview.data.summary.wonOpportunities, 1);
  assert.equal(repOverview.data.summary.lostOpportunities, 0);
  assert.equal(repOverview.data.summary.winRate, 100);
  assert.equal(repOverview.data.summary.openPipelineValueUsd, ((Number(kesOpen.estimatedAmount) + Number(usdOpen.estimatedAmount)) / 129).toFixed(2));
  assert.equal(repOverview.data.activities.interactionsRecorded, 1);
  assert.equal(repOverview.data.activities.upcomingFollowUps, 1);
  assert.equal(repOverview.data.activities.overdueFollowUps, 1);
  assert.equal(repOverview.data.activities.completedFollowUps, 1);
  assert.equal(repOverview.data.currencyBasis.kesPerUsd, "129");
  assert.equal((await request(`/api/analytics/overview?ownerId=${otherRep.user.id}`, "GET", undefined, rep)).response.status, 403);

  const adminOverview = await request(`/api/analytics/overview?startDate=${encodeURIComponent(testStart)}`, "GET", undefined, admin);
  assert.equal(adminOverview.response.status, 200);
  assert.ok(adminOverview.data.summary.totalOpportunities >= 5);
  assert.equal(adminOverview.data.summary.winRate, 50);
  assert.ok(adminOverview.data.distributions.byStage.some((entry) => entry.key === "CLOSED" && entry.count >= 2));
  assert.ok(adminOverview.data.distributions.byProductGroup.some((entry) => entry.count >= 5));
  const filtered = await request(`/api/analytics/overview?ownerId=${otherRep.user.id}&outcome=LOST`, "GET", undefined, admin);
  assert.equal(filtered.data.summary.totalOpportunities, 1);
  assert.equal(filtered.data.summary.openOpportunities, 0);
  assert.equal(filtered.data.summary.lostOpportunities, 1);

  const empty = await request(`/api/analytics/overview?ownerId=${emptyRep.user.id}`, "GET", undefined, admin);
  assert.equal(empty.data.summary.winRate, null);
  assert.equal(empty.data.summary.openOpportunities, 1);
  const future = await request(`/api/analytics/overview?startDate=${encodeURIComponent(new Date("2099-01-01T00:00:00.000Z").toISOString())}`, "GET", undefined, admin);
  assert.equal(future.data.summary.totalOpportunities, 0);
  assert.equal(future.data.summary.winRate, null);

  const before = repOverview.data.summary.totalOpportunities;
  await createOpportunity(rep, client.id, { title: "Metrics refresh", amount: "129", currency: "KES", route: "OTHER", productSubgroupId: subgroup.id });
  const updated = await request(`/api/analytics/overview?ownerId=${rep.user.id}`, "GET", undefined, rep);
  assert.equal(updated.data.summary.totalOpportunities, before + 1);
  console.log("PASS: analytics auth, validation, owner scope, filters, outcomes, exact currency conversion, activities, empty state and live updates");
} finally {
  await prisma.followUp.deleteMany({ where: { id: { in: created.followUps } } });
  await prisma.interaction.deleteMany({ where: { id: { in: created.interactions } } });
  await prisma.quotation.deleteMany({ where: { opportunityId: { in: created.opportunities } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
