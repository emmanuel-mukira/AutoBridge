import "dotenv/config";
import assert from "node:assert/strict";
import pg from "pg";

const url = process.env.DATABASE_URL_ADMIN;
if (process.env.NODE_ENV !== "development" || !url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error("Schema check requires the local development database");
}

const db = new pg.Client({ connectionString: url });
await db.connect();
let rolledBack = false;
async function expectRejected(name, sql, values = []) {
  await db.query(`SAVEPOINT ${name}`);
  await assert.rejects(db.query(sql, values));
  await db.query(`ROLLBACK TO SAVEPOINT ${name}`);
}

try {
  await db.query("BEGIN");
  const user = (await db.query('SELECT id FROM "User" WHERE role = $1 LIMIT 1', ["ADMIN"])).rows[0];
  const subgroup = (await db.query('SELECT id FROM "ProductSubgroup" LIMIT 1')).rows[0];
  assert.ok(user && subgroup, "Seed administrator and product subgroups first");
  const account = (await db.query('INSERT INTO "Account" ("businessName", "countyName", "locationAddress", "ownerId", "updatedAt") VALUES ($1,$2,$3,$4,now()) RETURNING id', ["Schema check", "Nairobi", "Test", user.id])).rows[0];
  const contact = (await db.query('INSERT INTO "Contact" ("accountId", "firstName", "lastName", "updatedAt") VALUES ($1,$2,$3,now()) RETURNING id', [account.id, "Test", "Contact"])).rows[0];
  const opportunity = (await db.query('INSERT INTO "Opportunity" ("accountId", "ownerId", "productSubgroupId", "title", "estimatedAmount", "currency", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now()) RETURNING id', [account.id, user.id, subgroup.id, "Test opportunity", "250000.00", "KES"])).rows[0];
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "AccountRevenueSummary" WHERE "accountId" = $1', [account.id])).rows[0].n, 0);
  const summary = (await db.query('INSERT INTO "AccountRevenueSummary" ("accountId", "amount", "currency", "coverageStart", "coverageEnd", "evidenceSource", "verifiedAt", "verifiedById") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [account.id, "0.00", "KES", "2024-10-20", "2026-10-20", "Verified ledger", "2026-10-21", user.id])).rows[0];
  await expectRejected("invalid_period", 'INSERT INTO "AccountRevenueSummary" ("accountId", "amount", "currency", "coverageStart", "coverageEnd", "evidenceSource", "verifiedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)', [account.id, "0", "KES", "2026-10-20", "2024-10-20", "Invalid", "2026-10-21"]);
  await expectRejected("invalid_prediction", 'INSERT INTO "OpportunityPrediction" ("opportunityId", "modelVersion", "adapterVersion", "modelVariant", "inputSnapshot", "conversionSnapshot", "wonProbability") VALUES ($1,$2,$3,$4,$5,$6,$7)', [opportunity.id, "test", "test", "PRIMARY", "{}", "{}", "0.5"]);
  const prediction = (await db.query('INSERT INTO "OpportunityPrediction" ("opportunityId", "revenueSummaryId", "modelVersion", "adapterVersion", "modelVariant", "inputSnapshot", "conversionSnapshot", "wonProbability") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [opportunity.id, summary.id, "test", "test", "PRIMARY", "{}", "{}", "0.386130"])).rows[0];
  await db.query('INSERT INTO "PredictionReview" ("predictionId", "reviewerId", "assessment") VALUES ($1,$2,$3)', [prediction.id, user.id, "REASONABLE"]);
  await expectRejected("immutable_prediction", 'UPDATE "OpportunityPrediction" SET "wonProbability" = $1 WHERE id = $2', ["0.9", prediction.id]);
  await expectRejected("open_lost", 'UPDATE "Opportunity" SET "outcome" = $1, "outcomeAt" = now() WHERE id = $2', ["LOST", opportunity.id]);
  await db.query('UPDATE "Opportunity" SET "stage" = $1 WHERE id = $2', ["QUALIFYING", opportunity.id]);
  await expectRejected("backward_stage", 'UPDATE "Opportunity" SET "stage" = $1 WHERE id = $2', ["NEW", opportunity.id]);
  await db.query('UPDATE "Opportunity" SET "stage" = $1, "outcome" = $2, "outcomeAt" = now() WHERE id = $3', ["CLOSED", "LOST", opportunity.id]);
  await expectRejected("reopen", 'UPDATE "Opportunity" SET "stage" = $1, "outcome" = NULL, "outcomeAt" = NULL WHERE id = $2', ["NEW", opportunity.id]);
  const links = (await db.query('SELECT a.id AS account, c.id AS contact, o.id AS opportunity, p.id AS prediction, r.id AS review FROM "Account" a JOIN "Contact" c ON c."accountId"=a.id JOIN "Opportunity" o ON o."accountId"=a.id JOIN "OpportunityPrediction" p ON p."opportunityId"=o.id JOIN "PredictionReview" r ON r."predictionId"=p.id WHERE a.id=$1', [account.id])).rows;
  assert.equal(links.length, 1);
  assert.equal(links[0].contact, contact.id);
  await db.query("ROLLBACK");
  rolledBack = true;
  console.log("PASS: relationships, verified zero versus unknown, prediction integrity, and opportunity lifecycle (rolled back)");
} finally {
  if (!rolledBack) await db.query("ROLLBACK");
  await db.end();
}
