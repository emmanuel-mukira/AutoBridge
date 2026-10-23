import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { opportunities: [], clients: [], users: [], summaries: [] };

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
  return { response, data: response.status === 204 ? null : await response.json() };
}

async function signIn(email, password) {
  const result = await request("/api/auth/login", "POST", { email, password });
  assert.equal(result.response.status, 200);
  return { cookie: result.response.headers.get("set-cookie").split(";")[0], csrfToken: result.data.csrfToken, user: result.data.user };
}

async function createClosedOpportunity(clientId, ownerId, title, outcomeAt, amountUsd) {
  const opportunity = await prisma.opportunity.create({ data: { clientId, ownerId, title, estimatedAmount: amountUsd, currency: "USD" } });
  created.opportunities.push(opportunity.id);
  await prisma.opportunity.update({ where: { id: opportunity.id }, data: {
    stage: "CLOSED", outcome: "WON", outcomeAt,
    confirmedAmount: amountUsd, confirmedCurrency: "USD", confirmedAmountUsd: amountUsd,
    confirmedQuoteUnitsPerUsd: 1, confirmedRateSource: "USD identity conversion",
    confirmedRateObservedAt: outcomeAt, confirmedAt: outcomeAt,
  } });
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Development administrator credentials are required");
  assert.equal((await request("/api/clients/1/sales-history")).response.status, 401);
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const password = `${randomUUID()}-Test!`;
  const users = [];
  for (const label of ["owner", "outsider"]) {
    const result = await request("/api/auth/users", "POST", { email: `sales-history-${label}-${suffix}@example.test`, password, firstName: "History", lastName: label, role: "SALES_REP" }, admin);
    assert.equal(result.response.status, 201);
    created.users.push(result.data.user.id);
    users.push(await signIn(result.data.user.email, password));
  }
  const [owner, outsider] = users;
  const clientResult = await request("/api/clients", "POST", { businessName: `Sales History Client ${suffix}`, countyName: "Nairobi", locationAddress: "Test Road" }, owner);
  assert.equal(clientResult.response.status, 201);
  created.clients.push(clientResult.data.id);
  const clientId = clientResult.data.id;

  const createOpportunity = async (title) => {
    const result = await request("/api/opportunities", "POST", { clientId, title, estimatedAmount: "129000", currency: "KES" }, owner);
    assert.equal(result.response.status, 201);
    created.opportunities.push(result.data.id);
    return result.data;
  };
  const won = await createOpportunity(`Won ${suffix}`);
  const lost = await createOpportunity(`Lost ${suffix}`);
  await createOpportunity(`Open ${suffix}`);
  assert.equal((await request(`/api/opportunities/${won.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "WON" }, owner)).response.status, 400);
  const closedWon = await request(`/api/opportunities/${won.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "WON", confirmedAmount: "129000", confirmedCurrency: "KES" }, owner);
  assert.equal(closedWon.response.status, 200);
  assert.equal(closedWon.data.confirmedAmountUsd, "1000");
  assert.equal((await request(`/api/opportunities/${lost.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "LOST" }, owner)).response.status, 200);

  assert.equal((await request(`/api/clients/${clientId}/sales-history`, "GET", undefined, outsider)).response.status, 404);
  assert.equal((await request(`/api/clients/${clientId}/revenue-coverage`, "POST", { coverageStart: "2024-01-01T00:00:00.000Z", coverageEnd: new Date().toISOString(), evidenceSource: "Unauthorized test" }, outsider)).response.status, 404);
  assert.equal((await request(`/api/opportunities/${won.id}/confirmed-sale`, "PATCH", { confirmedAmount: "1", confirmedCurrency: "USD" }, outsider)).response.status, 404);

  const asOf = new Date(Date.now() - 1);
  const windowStart = new Date(asOf);
  windowStart.setUTCFullYear(windowStart.getUTCFullYear() - 2);
  await createClosedOpportunity(clientId, owner.user.id, `Boundary included ${suffix}`, windowStart, "1");
  await createClosedOpportunity(clientId, owner.user.id, `Boundary excluded ${suffix}`, new Date(windowStart.getTime() - 1), "9000");
  const coverage = await prisma.clientRevenueSummary.create({ data: {
    clientId, amount: "1001", currency: "USD", coverageStart: new Date(windowStart.getTime() - 86_400_000),
    coverageEnd: new Date(asOf.getTime() - 1), evidenceSource: `Boundary verification ${suffix}`,
    verifiedAt: new Date(asOf.getTime() - 1), verifiedById: owner.user.id,
  } });
  created.summaries.push(coverage.id);
  const history = await request(`/api/clients/${clientId}/sales-history?asOf=${encodeURIComponent(asOf.toISOString())}`, "GET", undefined, owner);
  assert.equal(history.response.status, 200);
  assert.equal(history.data.revenueEvidence.state, "VERIFIED_COMPLETE");
  assert.equal(history.data.revenueEvidence.amountUsd, "1001");
  assert.equal(history.data.revenueEvidence.ibmRevenueCode, 1);
  assert.equal(history.data.opportunities.filter((item) => item.outcome === "LOST").length, 1);
  assert.equal(history.data.opportunities.filter((item) => item.outcome === null).length, 1);

  const corrected = await request(`/api/opportunities/${won.id}/confirmed-sale`, "PATCH", { confirmedAmount: "258000", confirmedCurrency: "KES" }, owner);
  assert.equal(corrected.response.status, 200);
  assert.equal(corrected.data.confirmedAmountUsd, "2000");
  const current = await request(`/api/clients/${clientId}/sales-history`, "GET", undefined, owner);
  assert.equal(current.data.confirmedSales.totalUsd, "11001");

  const zeroClient = await request("/api/clients", "POST", { businessName: `Verified Zero Client ${suffix}`, countyName: "Nairobi", locationAddress: "Zero Road" }, owner);
  created.clients.push(zeroClient.data.id);
  const coverageEnd = new Date();
  const coverageStart = new Date(coverageEnd); coverageStart.setUTCFullYear(coverageStart.getUTCFullYear() - 2); coverageStart.setUTCDate(coverageStart.getUTCDate() - 1);
  const zeroCoverage = await request(`/api/clients/${zeroClient.data.id}/revenue-coverage`, "POST", { coverageStart: coverageStart.toISOString(), coverageEnd: coverageEnd.toISOString(), evidenceSource: "Complete synthetic test records" }, owner);
  assert.equal(zeroCoverage.response.status, 201);
  created.summaries.push(zeroCoverage.data.id);
  const zeroHistory = await request(`/api/clients/${zeroClient.data.id}/sales-history`, "GET", undefined, owner);
  assert.equal(zeroHistory.data.revenueEvidence.state, "VERIFIED_ZERO");
  assert.equal(zeroHistory.data.revenueEvidence.ibmRevenueCode, 0);

  console.log("PASS: confirmed Won values, exclusion of Lost/open/missing values, conversion, two-year boundary, verified zero, unknown/ownership rules, and corrections");
} finally {
  await prisma.clientRevenueSummary.deleteMany({ where: { id: { in: created.summaries } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
