import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { opportunities: [], clients: [], users: [] };

async function request(path, method = "GET", body, session) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(session ? { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}

async function signIn(email, password) {
  const result = await request("/api/auth/login", "POST", { email, password });
  assert.equal(result.response.status, 200);
  return {
    cookie: result.response.headers.get("set-cookie").split(";")[0],
    csrfToken: result.data.csrfToken,
    user: result.data.user,
  };
}

async function removeInterruptedVerificationRows() {
  const clients = await prisma.client.findMany({
    where: { OR: [{ businessName: { startsWith: "Opportunity Client " } }, { businessName: { startsWith: "Admin Client " } }] },
    select: { id: true },
  });
  const clientIds = clients.map((client) => client.id);
  if (clientIds.length) {
    await prisma.opportunity.deleteMany({ where: { clientId: { in: clientIds } } });
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: "opportunity-rep-", endsWith: "@example.test" } } });
}

try {
  await removeInterruptedVerificationRows();
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Development administrator credentials are required");
  assert.equal((await request("/api/opportunities")).response.status, 401);
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

  assert.equal((await request("/api/customers", "GET", undefined, admin)).response.status, 404);
  assert.equal((await request("/api/customer-contacts", "GET", undefined, admin)).response.status, 404);
  assert.equal((await request("/api/leads", "GET", undefined, admin)).response.status, 404);

  const products = await request("/api/opportunities/products", "GET", undefined, admin);
  assert.equal(products.response.status, 200);
  assert.ok(products.data.productGroups.length > 0);
  const subgroup = products.data.productGroups.flatMap((group) => group.subgroups)[0];
  assert.ok(subgroup);

  const repEmail = `opportunity-rep-${suffix}@example.test`;
  const repPassword = `${randomUUID()}-Test!`;
  const repUser = await request("/api/auth/users", "POST", { email: repEmail, password: repPassword, firstName: "Opportunity", lastName: "Rep", role: "SALES_REP" }, admin);
  assert.equal(repUser.response.status, 201);
  created.users.push(repUser.data.user.id);
  const rep = await signIn(repEmail, repPassword);

  const repClient = await request("/api/clients", "POST", { businessName: `Opportunity Client ${suffix}`, countyName: "Nairobi", locationAddress: "Test Avenue" }, rep);
  assert.equal(repClient.response.status, 201);
  created.clients.push(repClient.data.id);

  const adminClient = await request("/api/clients", "POST", { businessName: `Admin Client ${suffix}`, countyName: "Nairobi", locationAddress: "Admin Avenue" }, admin);
  assert.equal(adminClient.response.status, 201);
  created.clients.push(adminClient.data.id);

  const validInput = {
    clientId: repClient.data.id,
    ownerId: rep.user.id,
    productSubgroupId: subgroup.id,
    title: `Fleet parts renewal ${suffix}`,
    estimatedAmount: "250000.00",
    currency: "KES",
    routeToMarket: "RESELLER",
    estimatedCloseAt: new Date(Date.now() + 86_400_000).toISOString(),
  };

  const noCsrf = await fetch(`${base}/api/opportunities`, { method: "POST", headers: { Cookie: rep.cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(validInput) });
  assert.equal(noCsrf.status, 403);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, estimatedAmount: "12.345" }, rep)).response.status, 400);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, clientId: 2_147_483_647 }, rep)).response.status, 400);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, productSubgroupId: 2_147_483_647 }, rep)).response.status, 400);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, ownerId: admin.user.id }, rep)).response.status, 403);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, clientId: adminClient.data.id, ownerId: rep.user.id }, admin)).response.status, 400);

  const createdOpportunity = await request("/api/opportunities", "POST", validInput, rep);
  assert.equal(createdOpportunity.response.status, 201);
  created.opportunities.push(createdOpportunity.data.id);
  assert.equal(createdOpportunity.data.stage, "NEW");
  assert.equal(createdOpportunity.data.client.id, repClient.data.id);
  assert.equal(createdOpportunity.data.productSubgroup.id, subgroup.id);
  assert.equal((await request(`/api/clients/${repClient.data.id}`, "PATCH", { ownerId: admin.user.id }, admin)).response.status, 409);

  const stored = await prisma.opportunity.findUnique({ where: { id: createdOpportunity.data.id } });
  assert.equal(stored?.estimatedAmount.toFixed(2), "250000.00");
  assert.equal(stored?.currency, "KES");

  const bySearch = await request(`/api/opportunities?search=${encodeURIComponent(suffix)}&stage=NEW`, "GET", undefined, rep);
  assert.equal(bySearch.response.status, 200);
  assert.equal(bySearch.data.opportunities.length, 1);
  assert.deepEqual((await request(`/api/opportunities?clientId=${repClient.data.id}`, "GET", undefined, rep)).data.opportunities.map((item) => item.id), [createdOpportunity.data.id]);
  assert.equal((await request(`/api/opportunities/${createdOpportunity.data.id}`, "GET", undefined, rep)).response.status, 200);
  assert.equal((await request(`/api/opportunities/${createdOpportunity.data.id}`, "PATCH", { title: "Updated fleet renewal", estimatedAmount: "300000.00" }, rep)).data.title, "Updated fleet renewal");
  const stageWithoutCsrf = await fetch(`${base}/api/opportunities/${createdOpportunity.data.id}/stage`, { method: "PATCH", headers: { Cookie: rep.cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ stage: "PROPOSAL" }) });
  assert.equal(stageWithoutCsrf.status, 403);
  assert.equal((await request(`/api/opportunities/${createdOpportunity.data.id}/stage`, "PATCH", { stage: "PROPOSAL" }, rep)).data.stage, "PROPOSAL");
  assert.equal((await request(`/api/opportunities/${createdOpportunity.data.id}/stage`, "PATCH", { stage: "QUALIFYING" }, rep)).response.status, 409);
  assert.equal((await request(`/api/opportunities/${createdOpportunity.data.id}/stage`, "PATCH", { stage: "CLOSED" }, rep)).response.status, 400);
  const closed = await request(`/api/opportunities/${createdOpportunity.data.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "WON" }, rep);
  assert.equal(closed.response.status, 200);
  assert.equal(closed.data.outcome, "WON");
  assert.ok(closed.data.outcomeAt);
  assert.equal((await request(`/api/opportunities/${createdOpportunity.data.id}/stage`, "PATCH", { stage: "NEW" }, rep)).response.status, 409);

  const adminOpportunity = await request("/api/opportunities", "POST", {
    clientId: adminClient.data.id,
    ownerId: admin.user.id,
    title: `Admin private ${suffix}`,
    estimatedAmount: "1000",
    currency: "USD",
  }, admin);
  assert.equal(adminOpportunity.response.status, 201);
  created.opportunities.push(adminOpportunity.data.id);
  assert.equal((await request(`/api/opportunities/${adminOpportunity.data.id}`, "GET", undefined, rep)).response.status, 404);
  assert.equal((await request(`/api/opportunities/${adminOpportunity.data.id}`, "PATCH", { title: "Denied" }, rep)).response.status, 404);
  assert.equal((await request(`/api/opportunities/${adminOpportunity.data.id}/stage`, "PATCH", { stage: "QUALIFYING" }, rep)).response.status, 404);
  assert.ok((await request("/api/opportunities", "GET", undefined, admin)).data.opportunities.some((item) => item.id === createdOpportunity.data.id));

  console.log("PASS: routes, validation, CSRF, ownership, reassignment guard, opportunity CRUD, forward stages, closure and persistence");
} finally {
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
