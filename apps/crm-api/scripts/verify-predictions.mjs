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
let catalogueProduct;

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
  const result = await request("/api/opportunities", "POST", { clientId, title: `${title} ${suffix}`, productSubgroupId, items: [{ productId: catalogueProduct.id, quantity: "2" }], ...(complete ? { routeToMarket: "RESELLER" } : {}) }, session);
  assert.equal(result.response.status, 201);
  created.opportunities.push(result.data.id);
  return result.data;
}

async function addCoverage(clientId, verifierId, amount = "0") {
  const row = await prisma.clientRevenueSummary.create({ data: { clientId, amount, currency: "USD", coverageStart: new Date("2020-01-01T00:00:00Z"), coverageEnd: new Date(Date.now() + 86_400_000), evidenceSource: `Prediction verifier ${suffix}`, declaration: Number(amount) === 0 ? "NO" : "YES", complete: true, verifiedAt: new Date(Date.now() - 1000), verifiedById: verifierId } });
  created.summaries.push(row.id);
  return row;
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ML_API_URL && process.env.ML_API_TOKEN);
  assert.equal((await request("/api/opportunities/1/score", "POST")).response.status, 401);
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const outsider = await signIn("samuel@autobridge.local", process.env.ADMIN_PASSWORD);
  const products = await request("/api/opportunities/products", "GET", undefined, admin);
  const subgroup = products.data.productGroups.find((group) => group.name === "Car Accessories").subgroups.find((item) => item.name === "Replacement Parts");
  catalogueProduct = (await request(`/api/products?productSubgroupId=${subgroup.id}`, "GET", undefined, admin)).data.products[0];

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
  await addCoverage(zeroClient.id, admin.user.id);

  const primaryPositive = await request(`/api/opportunities/${positive.id}/score`, "POST", {}, admin);
  assert.equal(primaryPositive.response.status, 201);
  assert.equal(primaryPositive.data.modelVariant, "PRIMARY");
  assert.ok(primaryPositive.data.revenueSummaryId);
  assert.equal(primaryPositive.data.inputSnapshot.revenueEvidence.coverageId, primaryPositive.data.revenueSummaryId);
  assert.equal(primaryPositive.data.inputSnapshot.revenueEvidence.ibmRevenueCode, 1);
  const automaticSummary = await prisma.clientRevenueSummary.findUnique({ where: { id: primaryPositive.data.revenueSummaryId } });
  assert.equal(automaticSummary.evidenceSource, "Automatically calculated from confirmed Won opportunities");
  assert.equal(automaticSummary.amount.toString(), "1000");
  assert.equal(primaryPositive.data.explanation.status, "available");
  assert.equal(primaryPositive.data.explanation.explainer.class_label, "Won");
  assert.ok(primaryPositive.data.explanation.additivity_error <= 1e-6);
  assert.equal(primaryPositive.data.explanation.top_factors.length, 3);
  assert.deepEqual(primaryPositive.data.explanation.top_factors, [...primaryPositive.data.explanation.contributions].sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution)).slice(0, 3));
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
  const mlUrl = process.env.ML_API_URL;
  process.env.ML_API_URL = "http://127.0.0.1:9";
  const unchanged = await request(`/api/opportunities/${unknown.id}/score`, "POST", {}, admin);
  assert.equal(unchanged.response.status, 200);
  assert.equal(unchanged.data.reused, true);
  assert.match(unchanged.data.message, /already up to date/i);
  process.env.ML_API_URL = mlUrl;
  assert.equal((await request(`/api/opportunities/${incomplete.id}/score`, "POST", {}, admin)).response.status, 422);
  assert.equal((await request(`/api/opportunities/${positive.id}/predictions`, "GET", undefined, outsider)).response.status, 404);

  let history = await request(`/api/opportunities/${unknown.id}/predictions`, "GET", undefined, admin);
  assert.equal(history.data.history.length, 1);
  assert.equal(history.data.latest.stale, false);
  assert.deepEqual((await prisma.opportunityPrediction.findUnique({ where: { id: fallback.data.id }, select: { explanation: true } })).explanation, fallback.data.explanation);
  let listing = await request("/api/opportunities?limit=100", "GET", undefined, admin);
  assert.equal(listing.data.opportunities.find((item) => item.id === unknown.id).latestPrediction.stale, false);
  let decisionSupport = await request("/api/analytics/decision-support?limit=50", "GET", undefined, admin);
  assert.equal(decisionSupport.data.opportunities.find((item) => item.id === unknown.id).predictionStatus, "CURRENT");
  const scopedDecisionSupport = await request(`/api/analytics/decision-support?stage=NEW&startDate=${encodeURIComponent(new Date(Date.now() - 60_000).toISOString())}&endDate=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}&limit=50`, "GET", undefined, admin);
  assert.equal(scopedDecisionSupport.response.status, 200);
  assert.ok(scopedDecisionSupport.data.opportunities.some((item) => item.id === unknown.id));
  assert.ok(scopedDecisionSupport.data.opportunities.every((item) => item.id !== positive.id || item.owner.id === admin.user.id));
  const repDecisionSupport = await request("/api/analytics/decision-support?limit=50", "GET", undefined, outsider);
  assert.ok(repDecisionSupport.data.opportunities.every((item) => item.owner.id === outsider.user.id));
  assert.equal((await request("/api/analytics/decision-support?stage=CLOSED", "GET", undefined, admin)).response.status, 400);
  assert.equal(listing.data.opportunities.find((item) => item.id === incomplete.id).latestPrediction, null);
  const unknownQuotes = await request(`/api/quotations?opportunityId=${unknown.id}`, "GET", undefined, admin);
  const unknownDraft = unknownQuotes.data.quotations[0];
  assert.equal((await request(`/api/quotations/${unknownDraft.id}`, "PATCH", { contactId: null, validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(), discountPercent: "0", items: [{ productId: catalogueProduct.id, quantity: "3" }] }, admin)).response.status, 200);
  history = await request(`/api/opportunities/${unknown.id}/predictions`, "GET", undefined, admin);
  assert.equal(history.data.latest.stale, true);
  listing = await request("/api/opportunities?limit=100", "GET", undefined, admin);
  assert.equal(listing.data.opportunities.find((item) => item.id === unknown.id).latestPrediction.stale, true);
  decisionSupport = await request("/api/analytics/decision-support?limit=50", "GET", undefined, admin);
  assert.equal(decisionSupport.data.opportunities.find((item) => item.id === unknown.id).predictionStatus, "STALE");
  const rescored = await request(`/api/opportunities/${unknown.id}/score`, "POST", {}, admin);
  assert.equal(rescored.response.status, 201);
  assert.equal(rescored.data.reused, false);
  history = await request(`/api/opportunities/${unknown.id}/predictions`, "GET", undefined, admin);
  assert.equal(history.data.history.length, 2);
  assert.equal(history.data.latest.stale, false);
  assert.equal((await prisma.opportunity.findUnique({ where: { id: unknown.id } })).outcome, null);

  const finalQuotation = await request(`/api/quotations/${unknownDraft.id}`, "PATCH", { contactId: null, validUntil: new Date(Date.now() + 8 * 86_400_000).toISOString(), discountPercent: "0", items: [{ productId: catalogueProduct.id, quantity: "4" }] }, admin);
  assert.equal(finalQuotation.response.status, 200);
  const beforeFailure = await prisma.opportunityPrediction.count({ where: { opportunityId: unknown.id } });
  process.env.ML_API_URL = "http://127.0.0.1:9";
  await assert.rejects(() => new OpportunityScoringService().score(admin.user, unknown.id), /ML_UNAVAILABLE/);
  assert.equal(await prisma.opportunityPrediction.count({ where: { opportunityId: unknown.id } }), beforeFailure);
  process.env.ML_API_URL = mlUrl;
  const predictionAtOutcome = await request(`/api/opportunities/${unknown.id}/score`, "POST", {}, admin);
  assert.equal(predictionAtOutcome.response.status, 201);
  const closed = await request(`/api/opportunities/${unknown.id}/stage`, "PATCH", {
    stage: "CLOSED", outcome: "WON", confirmedAmount: finalQuotation.data.totalAmount, confirmedCurrency: "KES",
  }, admin);
  assert.equal(closed.response.status, 200);
  history = await request(`/api/opportunities/${unknown.id}/predictions`, "GET", undefined, admin);
  assert.equal(history.data.latest.stale, false);
  assert.equal(history.data.latest.outcomeSnapshot, true);
  decisionSupport = await request("/api/analytics/decision-support?limit=50", "GET", undefined, admin);
  const monitoredOutcome = decisionSupport.data.outcomeMonitoring.opportunities.find((item) => item.id === unknown.id);
  assert.equal(monitoredOutcome.outcome, "WON");
  assert.equal(monitoredOutcome.wonProbability, Number(predictionAtOutcome.data.wonProbability));

  for (const prediction of [primaryPositive.data, primaryZero.data, fallback.data]) {
    assert.ok(Number(prediction.wonProbability) >= 0 && Number(prediction.wonProbability) <= 1);
  }
  const legacy = await prisma.opportunityPrediction.create({ data: { opportunityId: incomplete.id, modelVersion: "automotive_v1", adapterVersion: "legacy-test", modelVariant: "LIMITED_HISTORY", inputSnapshot: {}, conversionSnapshot: {}, wonProbability: "0.5" } });
  const legacyHistory = await request(`/api/opportunities/${incomplete.id}/predictions`, "GET", undefined, admin);
  assert.equal(legacyHistory.data.history.find((item) => item.id === legacy.id).explanation, null);

  console.log("PASS: primary/fallback SHAP persistence, deduplication, freshness, pre-outcome monitoring, auth and failed-inference persistence");
} finally {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE "OpportunityPrediction" DISABLE TRIGGER "OpportunityPrediction_immutable"');
    await tx.opportunityPrediction.deleteMany({ where: { opportunityId: { in: created.opportunities } } });
    await tx.$executeRawUnsafe('ALTER TABLE "OpportunityPrediction" ENABLE TRIGGER "OpportunityPrediction_immutable"');
  });
  await prisma.clientRevenueSummary.deleteMany({ where: { clientId: { in: created.clients } } });
  await prisma.quotation.deleteMany({ where: { opportunityId: { in: created.opportunities } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.$disconnect();
}
