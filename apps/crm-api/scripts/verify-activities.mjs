import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { users: [], clients: [], opportunities: [], interactions: [], followUps: [] };

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
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}

async function signIn(email, password) {
  const result = await request("/api/auth/login", "POST", { email, password });
  assert.equal(result.response.status, 200);
  const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie && result.data.csrfToken);
  return { cookie, csrfToken: result.data.csrfToken, user: result.data.user };
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Development administrator credentials are required");
  assert.equal((await request("/api/interactions")).response.status, 401);
  assert.equal((await request("/api/follow-ups")).response.status, 401);
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

  const password = `${randomUUID()}-Test1!`;
  const createRep = async (name) => {
    const result = await request("/api/auth/users", "POST", { email: `${name}-${suffix}@example.test`, password, firstName: name, lastName: "Rep", role: "SALES_REP" }, admin);
    assert.equal(result.response.status, 201);
    created.users.push(result.data.user.id);
    return signIn(result.data.user.email, password);
  };
  const rep = await createRep("Activity");
  const otherRep = await createRep("Other");
  const clientResult = await request("/api/clients", "POST", { businessName: `Activity Client ${suffix}`, countyName: "Nairobi", locationAddress: "Test Road" }, rep);
  assert.equal(clientResult.response.status, 201);
  created.clients.push(clientResult.data.id);
  const otherClientResult = await request("/api/clients", "POST", { businessName: `Other Client ${suffix}`, countyName: "Nairobi", locationAddress: "Other Road" }, otherRep);
  assert.equal(otherClientResult.response.status, 201);
  created.clients.push(otherClientResult.data.id);

  const opportunityResult = await request("/api/opportunities", "POST", { clientId: clientResult.data.id, ownerId: rep.user.id, title: `Activity Opportunity ${suffix}`, estimatedAmount: "100000", currency: "KES" }, rep);
  assert.equal(opportunityResult.response.status, 201);
  created.opportunities.push(opportunityResult.data.id);
  const otherOpportunityResult = await request("/api/opportunities", "POST", { clientId: otherClientResult.data.id, ownerId: otherRep.user.id, title: `Other Opportunity ${suffix}`, estimatedAmount: "200000", currency: "KES" }, otherRep);
  assert.equal(otherOpportunityResult.response.status, 201);
  created.opportunities.push(otherOpportunityResult.data.id);

  const interactionInput = { clientId: clientResult.data.id, opportunityId: opportunityResult.data.id, interactionType: "CALL", notes: "Discussed parts requirements", occurredAt: new Date().toISOString() };
  const noCsrf = await fetch(`${base}/api/interactions`, { method: "POST", headers: { Cookie: rep.cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(interactionInput) });
  assert.equal(noCsrf.status, 403);
  assert.equal((await request("/api/interactions", "POST", { ...interactionInput, occurredAt: "invalid" }, rep)).response.status, 400);
  assert.equal((await request("/api/interactions", "POST", { ...interactionInput, opportunityId: undefined }, rep)).response.status, 400);
  assert.equal((await request("/api/interactions", "POST", { ...interactionInput, opportunityId: otherOpportunityResult.data.id }, rep)).response.status, 400);
  const interaction = await request("/api/interactions", "POST", interactionInput, rep);
  assert.equal(interaction.response.status, 201);
  created.interactions.push(interaction.data.id);
  assert.equal(interaction.data.userId, rep.user.id);
  assert.equal(interaction.data.opportunity.id, opportunityResult.data.id);
  assert.equal((await request(`/api/interactions?clientId=${clientResult.data.id}`, "GET", undefined, rep)).data.interactions.length, 1);
  assert.equal((await request(`/api/interactions/${interaction.data.id}`, "GET", undefined, otherRep)).response.status, 404);
  assert.equal((await request(`/api/interactions/${interaction.data.id}`, "PATCH", { notes: "Updated discussion notes" }, rep)).data.notes, "Updated discussion notes");

  assert.equal((await request(`/api/opportunities/${opportunityResult.data.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "LOST" }, rep)).response.status, 200);
  const adminInteraction = await request("/api/interactions", "POST", { ...interactionInput, interactionType: "EMAIL", occurredAt: new Date(Date.now() + 1000).toISOString() }, admin);
  assert.equal(adminInteraction.response.status, 201);
  created.interactions.push(adminInteraction.data.id);
  assert.equal((await request(`/api/interactions/${adminInteraction.data.id}`, "GET", undefined, rep)).response.status, 200);
  assert.equal((await request(`/api/interactions/${adminInteraction.data.id}`, "PATCH", { notes: "Denied" }, rep)).response.status, 404);

  const followUpInput = { clientId: clientResult.data.id, opportunityId: opportunityResult.data.id, title: "Send revised quote", channel: "EMAIL", dueAt: new Date(Date.now() + 86_400_000).toISOString() };
  assert.equal((await request("/api/follow-ups", "POST", { ...followUpInput, opportunityId: undefined }, rep)).response.status, 400);
  assert.equal((await request("/api/follow-ups", "POST", { ...followUpInput, channel: "SMS" }, rep)).response.status, 400);
  assert.equal((await request("/api/follow-ups", "POST", { ...followUpInput, title: "" }, rep)).response.status, 400);
  assert.equal((await request("/api/follow-ups", "POST", { ...followUpInput, ownerId: otherRep.user.id }, rep)).response.status, 403);
  assert.equal((await request("/api/follow-ups", "POST", { ...followUpInput, opportunityId: otherOpportunityResult.data.id }, rep)).response.status, 400);
  const followUp = await request("/api/follow-ups", "POST", followUpInput, rep);
  assert.equal(followUp.response.status, 201);
  created.followUps.push(followUp.data.id);
  assert.equal(followUp.data.ownerId, rep.user.id);
  assert.equal(followUp.data.channel, "EMAIL");
  assert.equal((await request(`/api/follow-ups/${followUp.data.id}`, "GET", undefined, otherRep)).response.status, 404);
  const rescheduledAt = new Date(Date.now() + 172_800_000).toISOString();
  const rescheduled = await request(`/api/follow-ups/${followUp.data.id}`, "PATCH", { dueAt: rescheduledAt, title: "Confirm revised quote", channel: "CALL" }, rep);
  assert.equal(rescheduled.response.status, 200);
  assert.equal(rescheduled.data.title, "Confirm revised quote");
  assert.equal(rescheduled.data.channel, "CALL");
  const completed = await request(`/api/follow-ups/${followUp.data.id}/complete`, "PATCH", {}, rep);
  assert.equal(completed.response.status, 200);
  assert.ok(completed.data.completedAt);
  const completedAgain = await request(`/api/follow-ups/${followUp.data.id}/complete`, "PATCH", {}, rep);
  assert.equal(completedAgain.data.completedAt, completed.data.completedAt);
  assert.equal((await request(`/api/follow-ups?completed=true&clientId=${clientResult.data.id}`, "GET", undefined, rep)).data.followUps.length, 1);
  assert.ok((await request("/api/follow-ups", "GET", undefined, admin)).data.followUps.some((item) => item.id === followUp.data.id));

  assert.ok(await prisma.interaction.findUnique({ where: { id: interaction.data.id } }));
  assert.ok((await prisma.followUp.findUnique({ where: { id: followUp.data.id } }))?.completedAt);
  const legacyInteraction = await prisma.interaction.create({ data: { clientId: clientResult.data.id, opportunityId: null, userId: rep.user.id, interactionType: "CALL", occurredAt: new Date() } });
  created.interactions.push(legacyInteraction.id);
  assert.equal((await request(`/api/interactions?clientId=${clientResult.data.id}`, "GET", undefined, rep)).data.interactions.some((item) => item.id === legacyInteraction.id), true);
  assert.equal((await request(`/api/interactions/${interaction.data.id}`, "DELETE", undefined, rep)).response.status, 204);
  created.interactions = created.interactions.filter((id) => id !== interaction.data.id);
  console.log("PASS: required opportunity links, open/resolved associations, legacy preservation, auth, ownership, persistence, rescheduling and completion");
} finally {
  await prisma.followUp.deleteMany({ where: { id: { in: created.followUps } } });
  await prisma.interaction.deleteMany({ where: { id: { in: created.interactions } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunities } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
