import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../dist/src/client.js";
import { OpportunityScoringService } from "../dist/src/services/opportunityScoringService.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { clients: [], opportunities: [], summaries: [] };

async function request(path, method = "GET", body, session) {
  const response = await fetch(`${base}${path}`, { method, headers: { Origin: origin, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(session ? { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { response, data: response.status === 204 ? null : await response.json() };
}

async function signIn(email, password) {
  const result = await request("/api/auth/login", "POST", { email, password });
  assert.equal(result.response.status, 200);
  return { cookie: result.response.headers.get("set-cookie").split(";")[0], csrfToken: result.data.csrfToken, user: result.data.user };
}

async function createClient(session, name) {
  const result = await request("/api/clients", "POST", { businessName: `${name} ${suffix}`, countyName: "Nairobi", locationAddress: "Prediction Test Road" }, session);
  assert.equal(result.response.status, 201);
  created.clients.push(result.data.id);
  return result.data;
}

async function createOpportunity(session, clientId, productSubgroupId, title, complete = true) {
  const result = await request("/api/opportunities", "POST", { clientId, title: `${title} ${suffix}`, estimatedAmount: "250000", currency: "KES", ...(complete ? { routeToMarket: "RESELLER", productSubgroupId } : {}) }, session);
  assert.equal(result.response.status, 201);
  created.opportunities.push(result.data.id);
  return result.data;
}

async function addCoverage(clientId, verifierId, amount = "0") {
  const row = await prisma.clientRevenueSummary.create({ data: { clientId, amount, currency: "USD", coverageStart: new Date("2020-01-01T00:00:00Z"), coverageEnd: new Date(Date.now() - 86_400_000), evidenceSource: `Prediction verifier ${suffix}`, verifiedAt: new Date(Date.now() - 1000), verifiedById: verifierId } });
  created.summaries.push(row.id);
  return row;
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ML_API_URL && process.env.ML_API_TOKEN);
  assert.equal((await request("/api/opportunities/1/score", "POST")).response.status, 401);
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const outsider = await signIn("demo.sales@autobridge.test", process.env.ADMIN_PASSWORD);
  const products = await request("/api/opportunities/products", "GET", undefined, admin);
  const subgroup = products.data.productGroups.find((group) => group.name === "Car Accessories").subgroups.find((item) => item.name === "Replacement Parts");

  const positiveClient = await createClient(admin, "Verified positive");
  const zeroClient = await createClient(admin, "Verified zero");
  const unknownClient = await createClient(admin, "Unknown history");
  const positive = await createOpportunity(admin, positiveClient.id, subgroup.id, "Primary positive");
  const zero = await createOpportunity(admin, zeroClient.id, subgroup.id, "Primary zero");
  const unknown = await createOpportunity(admin, unknownClient.id, subgroup.id, "Fallback unknown");
  const incomplete = await createOpportunity(admin, unknownClient.id, subgroup.id, "Incomplete", false);

  const historical = await prisma.opportunity.create({ data: { clientId: positiveClient.id, ownerId: admin.user.id, productSubgroupId: subgroup.id, title: `Historical ${suffix}`, estimatedAmount: "1300", currency: "USD", routeToMarket: "RESELLER" } });
  created.opportunities.push(historical.id);
  await prisma.opportunity.update({ where: { id: historical.id }, data: { stage: "CLOSED", outcome: "WON", outcomeAt: new Date(Date.now() - 365 * 86_400_000), confirmedAmount: "1000", confirmedCurrency: "USD", confirmedAmountUsd: "1000", confirmedQuoteUnitsPerUsd: "1", confirmedRateSource: "USD identity conversion", confirmedRateObservedAt: new Date(Date.now() - 365 * 86_400_000), confirmedAt: new Date(Date.now() - 365 * 86_400_000) } });
  await addCoverage(positiveClient.id, admin.user.id, "1000");
  await addCoverage(zeroClient.id, admin.user.id);

  const primaryPositive = await request(`/api/opportunities/${positive.id}/score`, "POST", {}, admin);
  assert.equal(primaryPositive.response.status, 201);
  assert.equal(primaryPositive.data.modelVariant, "PRIMARY");
  assert.equal(primaryPositive.data.inputSnapshot.revenueEvidence.ibmRevenueCode, 1);
  assert.equal(primaryPositive.data.explanation.status, "available");
  assert.equal(primaryPositive.data.explanation.explainer.class_label, "Won");
  assert.ok(primaryPositive.data.explanation.additivity_error <= 1e-6);
  const primaryZero = await request(`/api/opportunities/${zero.id}/score`, "POST", {}, admin);
  assert.equal(primaryZero.response.status, 201);
  assert.equal(primaryZero.data.modelVariant, "PRIMARY");
  assert.equal(primaryZero.data.inputSnapshot.revenueEvidence.ibmRevenueCode, 0);
  const fallback = await request(`/api/opportunities/${unknown.id}/score`, "POST", {}, admin);
  assert.equal(fallback.response.status, 201);
  assert.equal(fallback.data.modelVariant, "LIMITED_HISTORY");
  assert.equal(fallback.data.inputSnapshot.revenueEvidence.state, "UNKNOWN");
  assert.equal(fallback.data.explanation.status, "available");
  assert.deepEqual(fallback.data.explanation.contributions.map((item) => item.feature).sort(), Object.keys(fallback.data.inputSnapshot.modelReadyFeatures).sort());
  assert.equal((await request(`/api/opportunities/${unknown.id}/score`, "POST", {}, admin)).response.status, 201);
  assert.equal((await request(`/api/opportunities/${incomplete.id}/score`, "POST", {}, admin)).response.status, 422);
  assert.equal((await request(`/api/opportunities/${positive.id}/predictions`, "GET", undefined, outsider)).response.status, 404);

  let history = await request(`/api/opportunities/${unknown.id}/predictions`, "GET", undefined, admin);
  assert.equal(history.data.history.length, 2);
  assert.equal(history.data.latest.stale, false);
  assert.deepEqual((await prisma.opportunityPrediction.findUnique({ where: { id: fallback.data.id }, select: { explanation: true } })).explanation, fallback.data.explanation);
  let listing = await request("/api/opportunities?limit=100", "GET", undefined, admin);
  assert.equal(listing.data.opportunities.find((item) => item.id === unknown.id).latestPrediction.stale, false);
  assert.equal(listing.data.opportunities.find((item) => item.id === incomplete.id).latestPrediction, null);
  assert.equal((await request(`/api/opportunities/${unknown.id}`, "PATCH", { estimatedAmount: "300000" }, admin)).response.status, 200);
  history = await request(`/api/opportunities/${unknown.id}/predictions`, "GET", undefined, admin);
  assert.equal(history.data.latest.stale, true);
  listing = await request("/api/opportunities?limit=100", "GET", undefined, admin);
  assert.equal(listing.data.opportunities.find((item) => item.id === unknown.id).latestPrediction.stale, true);
  assert.equal((await prisma.opportunity.findUnique({ where: { id: unknown.id } })).outcome, null);

  const beforeFailure = await prisma.opportunityPrediction.count({ where: { opportunityId: unknown.id } });
  process.env.ML_API_URL = "http://127.0.0.1:9";
  await assert.rejects(() => new OpportunityScoringService().score(admin.user, unknown.id), /ML_UNAVAILABLE/);
  assert.equal(await prisma.opportunityPrediction.count({ where: { opportunityId: unknown.id } }), beforeFailure);

  for (const prediction of [primaryPositive.data, primaryZero.data, fallback.data]) {
    assert.ok(Number(prediction.wonProbability) >= 0 && Number(prediction.wonProbability) <= 1);
  }
  const legacy = await prisma.opportunityPrediction.create({ data: { opportunityId: incomplete.id, modelVersion: "automotive_v1", adapterVersion: "legacy-test", modelVariant: "LIMITED_HISTORY", inputSnapshot: {}, conversionSnapshot: {}, wonProbability: "0.5" } });
  const legacyHistory = await request(`/api/opportunities/${incomplete.id}/predictions`, "GET", undefined, admin);
  assert.equal(legacyHistory.data.history.find((item) => item.id === legacy.id).explanation, null);

  console.log("PASS: primary/fallback SHAP persistence, legacy null explanations, auth, latest list summaries, staleness, outcome isolation and failed-inference persistence");
} finally {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE "OpportunityPrediction" DISABLE TRIGGER "OpportunityPrediction_immutable"');
    await tx.opportunityPrediction.deleteMany({ where: { opportunityId: { in: created.opportunities } } });
    await tx.$executeRawUnsafe('ALTER TABLE "OpportunityPrediction" ENABLE TRIGGER "OpportunityPrediction_immutable"');
  });
  await prisma.clientRevenueSummary.deleteMany({ where: { id: { in: created.summaries } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.$disconnect();
}
