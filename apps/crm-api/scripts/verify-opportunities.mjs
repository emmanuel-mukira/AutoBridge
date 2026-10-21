import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { opportunities: [], accounts: [], users: [] };

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
  const accounts = await prisma.account.findMany({
    where: { OR: [{ businessName: { startsWith: "Opportunity Account " } }, { businessName: { startsWith: "Admin Account " } }] },
    select: { id: true },
  });
  const accountIds = accounts.map((account) => account.id);
  if (accountIds.length) {
    await prisma.opportunity.deleteMany({ where: { accountId: { in: accountIds } } });
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
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

  const repAccount = await request("/api/accounts", "POST", { businessName: `Opportunity Account ${suffix}`, countyName: "Nairobi", locationAddress: "Test Avenue" }, rep);
  assert.equal(repAccount.response.status, 201);
  created.accounts.push(repAccount.data.id);

  const adminAccount = await request("/api/accounts", "POST", { businessName: `Admin Account ${suffix}`, countyName: "Nairobi", locationAddress: "Admin Avenue" }, admin);
  assert.equal(adminAccount.response.status, 201);
  created.accounts.push(adminAccount.data.id);

  const validInput = {
    accountId: repAccount.data.id,
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
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, accountId: 2_147_483_647 }, rep)).response.status, 400);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, productSubgroupId: 2_147_483_647 }, rep)).response.status, 400);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, ownerId: admin.user.id }, rep)).response.status, 403);
  assert.equal((await request("/api/opportunities", "POST", { ...validInput, accountId: adminAccount.data.id, ownerId: rep.user.id }, admin)).response.status, 400);

  const createdOpportunity = await request("/api/opportunities", "POST", validInput, rep);
  assert.equal(createdOpportunity.response.status, 201);
  created.opportunities.push(createdOpportunity.data.id);
  assert.equal(createdOpportunity.data.stage, "NEW");
  assert.equal(createdOpportunity.data.account.id, repAccount.data.id);
  assert.equal(createdOpportunity.data.productSubgroup.id, subgroup.id);
  assert.equal((await request(`/api/accounts/${repAccount.data.id}`, "PATCH", { ownerId: admin.user.id }, admin)).response.status, 409);

  const stored = await prisma.opportunity.findUnique({ where: { id: createdOpportunity.data.id } });
  assert.equal(stored?.estimatedAmount.toFixed(2), "250000.00");
  assert.equal(stored?.currency, "KES");

  const bySearch = await request(`/api/opportunities?search=${encodeURIComponent(suffix)}&stage=NEW`, "GET", undefined, rep);
  assert.equal(bySearch.response.status, 200);
  assert.equal(bySearch.data.opportunities.length, 1);
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
    accountId: adminAccount.data.id,
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
  await prisma.account.deleteMany({ where: { id: { in: created.accounts } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
