import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { users: [], clients: [], opportunities: [], predictions: [] };

async function request(path, method = "GET", body, session, csrf = true) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(session ? { Cookie: session.cookie, ...(csrf ? { "X-CSRF-Token": session.csrfToken } : {}) } : {}),
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

async function createRep(admin, label) {
  const email = `${label}-${suffix}@example.test`;
  const password = `${randomUUID()}-Test1!`;
  const result = await request("/api/auth/users", "POST", { email, password, firstName: label, lastName: "Reviewer", role: "SALES_REP" }, admin);
  assert.equal(result.response.status, 201);
  created.users.push(result.data.user.id);
  return signIn(email, password);
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Development administrator credentials are required");
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const owner = await createRep(admin, "Owner");
  const outsider = await createRep(admin, "Outsider");

  const client = await prisma.client.create({ data: { ownerId: owner.user.id, businessName: `Review client ${suffix}`, countyName: "Nairobi", locationAddress: "Review Test Road" } });
  created.clients.push(client.id);
  const opportunities = await Promise.all(["Reviewed opportunity", "Other opportunity"].map((title) => prisma.opportunity.create({ data: {
    clientId: client.id, ownerId: owner.user.id, title: `${title} ${suffix}`, estimatedAmount: "250000", currency: "KES",
  } })));
  created.opportunities.push(...opportunities.map(({ id }) => id));
  const before = { stage: opportunities[0].stage, outcome: opportunities[0].outcome };
  const predictions = await Promise.all([0.38, 0.62].map((probability, index) => prisma.opportunityPrediction.create({ data: {
    opportunityId: opportunities[0].id, modelVersion: "review-verifier", adapterVersion: "review-verifier",
    modelVariant: "LIMITED_HISTORY", inputSnapshot: { version: index + 1 }, conversionSnapshot: { currency: "USD" }, wonProbability: probability,
  } })));
  created.predictions.push(...predictions.map(({ id }) => id));

  const path = (predictionId, opportunityId = opportunities[0].id) => `/api/opportunities/${opportunityId}/predictions/${predictionId}/reviews`;
  assert.equal((await request(path(predictions[0].id))).response.status, 401);
  assert.equal((await request(path(predictions[0].id), "GET", undefined, outsider)).response.status, 404);
  assert.equal((await request(path(predictions[0].id, opportunities[1].id), "GET", undefined, owner)).response.status, 404);
  assert.equal((await request(path(2147483647), "GET", undefined, owner)).response.status, 404);
  assert.equal((await request(path(predictions[0].id), "POST", { assessment: "REASONABLE" }, owner, false)).response.status, 403);
  assert.equal((await request(path(predictions[0].id), "POST", { assessment: "INVALID" }, owner)).response.status, 400);
  assert.equal((await request(path(predictions[0].id), "POST", { assessment: "REASONABLE", comment: "x".repeat(1001) }, owner)).response.status, 400);

  const reasonable = await request(path(predictions[0].id), "POST", { assessment: "REASONABLE" }, owner);
  assert.equal(reasonable.response.status, 201);
  assert.equal(reasonable.data.reviewerId, owner.user.id);
  assert.equal(reasonable.data.comment, null);
  const overestimated = await request(path(predictions[0].id), "POST", { assessment: "OVERESTIMATED", comment: "Known procurement delay" }, admin);
  assert.equal(overestimated.response.status, 201);
  const underestimated = await request(path(predictions[1].id), "POST", { assessment: "UNDERESTIMATED" }, owner);
  assert.equal(underestimated.response.status, 201);
  assert.equal((await request(path(predictions[0].id), "POST", { assessment: "UNDERESTIMATED" }, owner)).response.status, 409);
  const concurrent = await Promise.all([
    request(path(predictions[1].id), "POST", { assessment: "REASONABLE" }, admin),
    request(path(predictions[1].id), "POST", { assessment: "OVERESTIMATED" }, admin),
  ]);
  assert.deepEqual(concurrent.map(({ response }) => response.status).sort(), [201, 409]);

  const reviews = await request(path(predictions[0].id), "GET", undefined, owner);
  assert.equal(reviews.response.status, 200);
  assert.deepEqual(reviews.data.reviews.map(({ assessment }) => assessment).sort(), ["OVERESTIMATED", "REASONABLE"]);
  assert.ok(reviews.data.reviews.every(({ reviewer, createdAt }) => reviewer.id && createdAt));
  const history = await request(`/api/opportunities/${opportunities[0].id}/predictions`, "GET", undefined, owner);
  assert.equal(history.response.status, 200);
  assert.equal(history.data.history.find(({ id }) => id === predictions[0].id).reviews.length, 2);
  assert.equal(history.data.history.find(({ id }) => id === predictions[1].id).reviews[0].assessment, "UNDERESTIMATED");

  const unchangedPrediction = await prisma.opportunityPrediction.findUniqueOrThrow({ where: { id: predictions[0].id } });
  assert.equal(Number(unchangedPrediction.wonProbability), 0.38);
  await assert.rejects(() => prisma.opportunityPrediction.update({ where: { id: predictions[0].id }, data: { wonProbability: "0.9" } }));
  const unchangedOpportunity = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunities[0].id } });
  assert.deepEqual({ stage: unchangedOpportunity.stage, outcome: unchangedOpportunity.outcome }, before);
  console.log("PASS: prediction review categories, validation, authorization, uniqueness, persistence, history and immutability");
} finally {
  if (created.predictions.length) await prisma.$transaction(async (tx) => {
    await tx.predictionReview.deleteMany({ where: { predictionId: { in: created.predictions } } });
    await tx.$executeRawUnsafe('ALTER TABLE "OpportunityPrediction" DISABLE TRIGGER "OpportunityPrediction_immutable"');
    await tx.opportunityPrediction.deleteMany({ where: { id: { in: created.predictions } } });
    await tx.$executeRawUnsafe('ALTER TABLE "OpportunityPrediction" ENABLE TRIGGER "OpportunityPrediction_immutable"');
  });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
