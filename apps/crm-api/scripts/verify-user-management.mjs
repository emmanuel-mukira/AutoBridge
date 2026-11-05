import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { users: [], clients: [], opportunities: [], followUps: [], predictions: [], reviews: [] };

async function request(path, method = "GET", body, session) {
  const response = await fetch(`${base}${path}`, { method, headers: { Origin: origin, ...(body ? { "Content-Type": "application/json" } : {}), ...(session ? { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { response, data: response.status === 204 ? null : await response.json() };
}
async function signIn(email, password) {
  const result = await request("/api/auth/login", "POST", { email, password });
  assert.equal(result.response.status, 200);
  return { cookie: result.response.headers.get("set-cookie").split(";")[0], csrfToken: result.data.csrfToken, user: result.data.user };
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const password = `${randomUUID()}-test`;
  const email = `pending-${suffix}@example.test`;
  assert.equal((await request("/api/auth/register", "POST", { firstName: "Pending", lastName: "Representative", email, password })).response.status, 200);
  const pending = await prisma.user.findUniqueOrThrow({ where: { email } }); created.users.push(pending.id);
  assert.equal(pending.role, "SALES_REP"); assert.equal(pending.active, false); assert.equal(pending.approvedAt, null);
  assert.equal((await request("/api/auth/register", "POST", { firstName: "Duplicate", lastName: "User", email, password })).response.status, 409);
  assert.equal((await request("/api/auth/login", "POST", { email, password })).response.status, 401);
  assert.equal((await request(`/api/auth/users/${pending.id}/status`, "PATCH", { status: "APPROVED" }, admin)).response.status, 200);
  const first = await signIn(email, password);
  assert.equal((await request("/api/auth/users", "GET", undefined, first)).response.status, 403);

  const secondEmail = `second-${suffix}@example.test`; const temporary = `${randomUUID()}-temp`;
  const createdUser = await request("/api/auth/users", "POST", { firstName: "Second", lastName: "Representative", email: secondEmail, password: temporary, role: "SALES_REP" }, admin);
  assert.equal(createdUser.response.status, 201); created.users.push(createdUser.data.user.id);
  const second = await signIn(secondEmail, temporary); assert.equal(second.user.mustChangePassword, true);
  const newPassword = `${randomUUID()}-new`;
  const changed = await request("/api/auth/password", "PATCH", { currentPassword: temporary, newPassword }, second);
  assert.equal(changed.response.status, 200); assert.equal(changed.data.user.mustChangePassword, false);

  const client = await request("/api/clients", "POST", { businessName: `Assignment ${suffix}`, countyName: "Nairobi", locationAddress: "Test Road" }, first);
  assert.equal(client.response.status, 201); created.clients.push(client.data.id);
  const opportunity = await prisma.opportunity.create({ data: { clientId: client.data.id, ownerId: first.user.id, title: `Transfer ${suffix}`, estimatedAmount: "1000", currency: "USD" } }); created.opportunities.push(opportunity.id);
  const followUp = await prisma.followUp.create({ data: { clientId: client.data.id, opportunityId: opportunity.id, ownerId: first.user.id, title: "Transfer follow-up", dueAt: new Date(Date.now() + 86400000) } }); created.followUps.push(followUp.id);
  const prediction = await prisma.opportunityPrediction.create({ data: { opportunityId: opportunity.id, modelVersion: "automotive_v1", adapterVersion: "test", modelVariant: "LIMITED_HISTORY", inputSnapshot: {}, conversionSnapshot: {}, wonProbability: "0.500000" } }); created.predictions.push(prediction.id);
  const review = await prisma.predictionReview.create({ data: { predictionId: prediction.id, reviewerId: admin.user.id, assessment: "REASONABLE" } }); created.reviews.push(review.id);
  assert.equal((await request(`/api/clients/${client.data.id}`, "PATCH", { ownerId: second.user.id }, first)).response.status, 403);
  assert.equal((await request(`/api/clients/${client.data.id}`, "PATCH", { ownerId: second.user.id }, admin)).response.status, 200);
  assert.equal((await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } })).ownerId, second.user.id);
  assert.equal((await prisma.followUp.findUniqueOrThrow({ where: { id: followUp.id } })).ownerId, second.user.id);
  assert.ok(await prisma.opportunityPrediction.findUnique({ where: { id: prediction.id } }));
  assert.ok(await prisma.predictionReview.findUnique({ where: { id: review.id } }));

  assert.equal((await request(`/api/auth/users/${admin.user.id}/status`, "PATCH", { status: "DISABLED" }, admin)).response.status, 409);
  assert.equal((await request(`/api/auth/users/${first.user.id}/status`, "PATCH", { status: "DISABLED" }, admin)).response.status, 200);
  assert.equal((await request("/api/auth/me", "GET", undefined, first)).response.status, 401);
  assert.equal((await request(`/api/auth/users/${first.user.id}/status`, "PATCH", { status: "ACTIVE" }, admin)).response.status, 200);
  await signIn(email, password);

  assert.equal((await request(`/api/auth/users/${second.user.id}/reset-password`, "POST", { temporaryPassword: `${randomUUID()}-reset` }, admin)).response.status, 200);
  assert.equal((await request("/api/auth/me", "GET", undefined, second)).response.status, 401);
  console.log("PASS: registration, approval, authorization, password change/reset, session invalidation and transactional client reassignment");
} finally {
  await prisma.predictionReview.deleteMany({ where: { id: { in: created.reviews } } });
  await prisma.opportunityPrediction.deleteMany({ where: { id: { in: created.predictions } } });
  await prisma.followUp.deleteMany({ where: { id: { in: created.followUps } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
