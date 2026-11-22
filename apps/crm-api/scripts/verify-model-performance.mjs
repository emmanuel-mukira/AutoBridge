import assert from "node:assert/strict";
import express from "express";
import { predictionReliability } from "../dist/src/domain/predictionReliability.js";
import { prisma } from "../dist/src/client.js";
import analyticsRouter from "../dist/src/routes/analytics.routes.js";

const before = new Date("2026-01-01");
const closed = new Date("2026-02-01");
const prediction = (id, probability, changes = {}) => ({
  id,
  predictedAt: before,
  modelVersion: "automotive_v1",
  modelVariant: "PRIMARY",
  wonProbability: probability,
  ...changes,
});
const record = (outcome, predictions) => ({
  outcome,
  outcomeAt: closed,
  predictions,
});
const records = [
  record("WON", [
    prediction(1, 0.4),
    prediction(2, 0.7),
    prediction(3, 0.99, { predictedAt: new Date("2026-03-01") }),
  ]),
  record("LOST", [prediction(4, 1)]),
  record("LOST", [prediction(5, 0)]),
  record("WON", [prediction(6, 0.699999)]),
  record("WON", [prediction(7, 0.9, { modelVariant: "LIMITED_HISTORY" })]),
  record("WON", [
    prediction(8, 0.8),
    prediction(9, 0.9, { modelVersion: "future_v2" }),
  ]),
  record(null, [prediction(10, 0.8)]),
  record("WON", [prediction(11, NaN)]),
  record("WON", [prediction(12, 1.2)]),
];
const result = predictionReliability(records, "automotive_v1");
const fifty = predictionReliability(
  Array.from({ length: 50 }, (_, index) =>
    record(index < 35 ? "WON" : "LOST", [prediction(index, 0.7)]),
  ),
  "automotive_v1",
);
assert.equal(fifty.atLeast70.count, 50);
assert.equal(fifty.atLeast70.won, 35);
assert.equal(fifty.atLeast70.observedWinRate, 0.7);
assert.equal(result.eligible, 5);
assert.equal(result.atLeast70.count, 3);
assert.equal(result.atLeast70.won, 2);
assert.equal(result.atLeast70.lost, 1);
assert.equal(result.atLeast70.observedWinRate, 2 / 3);
assert.ok(Math.abs(result.atLeast70.meanPrediction - (0.7 + 1 + 0.9) / 3) < 1e-12);
assert.equal(result.bins[0].count, 1);
assert.equal(result.bins[6].count, 1);
assert.equal(result.bins[7].count, 1);
assert.equal(result.bins[9].count, 2);
assert.equal(
  result.bins.reduce((sum, bin) => sum + bin.count, 0),
  5,
);
assert.equal(
  predictionReliability([], "automotive_v1").atLeast70.observedWinRate,
  null,
);

// Exercise the actual auth middleware and route without reading or changing a database.
let role = "ADMIN";
let queries = 0;
const originalSessions = prisma.session.findUnique;
const originalOpportunities = prisma.opportunity.findMany;
prisma.session.findUnique = async () => ({
  id: 1,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60000),
  csrfHash: "test",
  user: {
    id: 1,
    role,
    active: true,
    approvedAt: before,
    mustChangePassword: false,
  },
});
prisma.opportunity.findMany = async (args) => {
  queries++;
  assert.deepEqual(args.where.client, { deletedAt: null });
  assert.deepEqual(args.where.outcome, { in: ["WON", "LOST"] });
  return records;
};
const app = express();
app.use((req, _res, next) => {
  req.cookies = req.header("x-test-session")
    ? { crm_session: "a".repeat(64) }
    : {};
  next();
});
app.use("/api/analytics", analyticsRouter);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
try {
  const url = `http://127.0.0.1:${server.address().port}/api/analytics/model-performance`;
  assert.equal((await fetch(url)).status, 401);
  role = "SALES_REP";
  assert.equal(
    (await fetch(url, { headers: { "x-test-session": "1" } })).status,
    403,
  );
  assert.equal(queries, 0);
  role = "ADMIN";
  const response = await fetch(url, { headers: { "x-test-session": "1" } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(
    body.evaluation.metrics.map((metric) => metric.value),
    [0.81441, 0.60221, 0.13079],
  );
  assert.equal(body.reliability.atLeast70.won, 2);
  assert.equal(body.reliability.atLeast70.count, 3);
  assert.equal(body.reliability.bins[9].won, 1);
  assert.equal(body.reliability.bins[9].lost, 1);
  assert.equal(body.demonstrationReliability.eligible, 1000);
  assert.equal(body.demonstrationReliability.atLeast70.count, 60);
  assert.equal(body.demonstrationReliability.atLeast70.won, 50);
  assert.equal(
    body.demonstrationReliability.bins.reduce((sum, bin) => sum + bin.count, 0),
    1000,
  );
  assert.ok(body.demonstrationReliability.bins.every((bin) => bin.count > 0));
  console.log(
    "PASS: frozen metrics, admin route, 401/403, latest pre-outcome selection, both model variants, empty and boundary bins, >=70% cohort",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  prisma.session.findUnique = originalSessions;
  prisma.opportunity.findMany = originalOpportunities;
  await prisma.$disconnect();
}
