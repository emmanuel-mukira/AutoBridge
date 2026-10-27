import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { opportunityIds: [], clientIds: [], userIds: [] };

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
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Development administrator credentials are required");
  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const password = `${randomUUID()}-Test!`;
  const sessions = [];
  for (const label of ["owner", "outsider"]) {
    const result = await request("/api/auth/users", "POST", { email: `quotation-${label}-${suffix}@example.test`, password, firstName: "Quote", lastName: label, role: "SALES_REP" }, admin);
    assert.equal(result.response.status, 201);
    created.userIds.push(result.data.user.id);
    sessions.push(await signIn(result.data.user.email, password));
  }
  const [owner, outsider] = sessions;
  const ownerClient = await request("/api/clients", "POST", { businessName: `Quotation Client ${suffix}`, countyName: "Nairobi", locationAddress: "Test Road" }, owner);
  created.clientIds.push(ownerClient.data.id);

  const productResult = await request("/api/products", "GET", undefined, owner);
  const active = productResult.data.products.filter((product) => product.active);
  const first = active[0];
  const second = active.find((product) => product.productSubgroupId !== first.productSubgroupId);
  assert.ok(second, "Verifier requires products from two subgroups");
  const input = {
    clientId: ownerClient.data.id, title: `Product-driven opportunity ${suffix}`, routeToMarket: "FIELDS_SALES",
    productSubgroupId: first.productSubgroupId,
    items: [{ productId: first.id, quantity: "2" }, { productId: second.id, quantity: "3" }],
  };
  const invalid = await request("/api/opportunities", "POST", { ...input, productSubgroupId: active.find((product) => ![first.productSubgroupId, second.productSubgroupId].includes(product.productSubgroupId))?.productSubgroupId ?? 999999 }, owner);
  assert.equal(invalid.response.status, 400);

  const opportunity = await request("/api/opportunities", "POST", input, owner);
  assert.equal(opportunity.response.status, 201);
  created.opportunityIds.push(opportunity.data.id);
  const expectedInitial = Number(first.defaultSellingPrice) * 2 + Number(second.defaultSellingPrice) * 3;
  assert.equal(Number(opportunity.data.estimatedAmount), expectedInitial);

  const initialList = await request(`/api/quotations?opportunityId=${opportunity.data.id}`, "GET", undefined, owner);
  assert.equal(initialList.data.quotations.length, 1);
  const v1 = initialList.data.quotations[0];
  assert.equal(v1.version, 1);
  assert.equal(v1.status, "DRAFT");
  assert.equal(v1.current, true);
  assert.equal(v1.discountPercent, "0");
  assert.equal((await request(`/api/quotations/${v1.id}`, "PATCH", { validUntil: v1.validUntil, discountPercent: "10", items: [{ productId: first.id, quantity: "2", unitPrice: "0.01" }] }, owner)).response.status, 400);

  const validUntil = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const draft = { contactId: null, validUntil, discountPercent: "10", notes: "Verifier", terms: "Commercial terms", items: input.items };
  const edited = await request(`/api/quotations/${v1.id}`, "PATCH", draft, owner);
  assert.equal(edited.response.status, 200);
  assert.equal(Number(edited.data.totalAmount), Number(edited.data.subtotal) - Number(edited.data.discountAmount));
  const draftOpportunity = await request(`/api/opportunities/${opportunity.data.id}`, "GET", undefined, owner);
  assert.equal(Number(draftOpportunity.data.estimatedAmount), Number(edited.data.totalAmount));

  assert.equal((await request(`/api/quotations/${v1.id}/status`, "PATCH", { status: "SENT" }, owner)).response.status, 200);
  const revision = await request(`/api/quotations/${v1.id}/revisions`, "POST", undefined, owner);
  assert.equal(revision.response.status, 201);
  assert.equal(revision.data.version, 2);
  assert.equal(revision.data.current, false);
  assert.equal(revision.data.supersedesId, v1.id);
  const revised = await request(`/api/quotations/${revision.data.id}`, "PATCH", { ...draft, discountPercent: "12.5", items: [{ productId: first.id, quantity: "4" }, { productId: second.id, quantity: "3" }] }, owner);
  assert.equal(revised.response.status, 200);
  const beforeIssue = await request(`/api/opportunities/${opportunity.data.id}`, "GET", undefined, owner);
  assert.equal(Number(beforeIssue.data.estimatedAmount), Number(edited.data.totalAmount));
  assert.equal((await request(`/api/quotations/${revision.data.id}/status`, "PATCH", { status: "SENT" }, owner)).response.status, 200);

  const history = await request(`/api/quotations?opportunityId=${opportunity.data.id}`, "GET", undefined, owner);
  const savedV1 = history.data.quotations.find((quotation) => quotation.version === 1);
  const savedV2 = history.data.quotations.find((quotation) => quotation.version === 2);
  assert.equal(savedV1.status, "SUPERSEDED");
  assert.equal(savedV1.current, false);
  assert.equal(savedV2.status, "SENT");
  assert.equal(savedV2.current, true);
  const afterIssue = await request(`/api/opportunities/${opportunity.data.id}`, "GET", undefined, owner);
  assert.equal(Number(afterIssue.data.estimatedAmount), Number(savedV2.totalAmount));
  assert.equal((await request(`/api/quotations/${savedV1.id}`, "PATCH", draft, owner)).response.status, 409);
  assert.equal((await request(`/api/quotations/${savedV2.id}`, "GET", undefined, outsider)).response.status, 404);
  const series = await request(`/api/quotations/series?search=${encodeURIComponent(savedV2.quoteNumber)}&page=1&limit=20`, "GET", undefined, owner);
  assert.equal(series.response.status, 200);
  assert.equal(series.data.series.length, 1);
  assert.equal(series.data.series[0].id, savedV2.id);
  assert.equal(series.data.series[0].versionCount, 2);
  assert.equal(series.data.series[0].status, "SENT");
  assert.equal((await request(`/api/quotations/series?search=${encodeURIComponent(savedV2.quoteNumber)}&status=DRAFT`, "GET", undefined, owner)).data.series.length, 0);
  assert.equal((await request(`/api/quotations/series?search=${encodeURIComponent(savedV2.quoteNumber)}`, "GET", undefined, outsider)).data.series.length, 0);
  assert.equal((await request(`/api/quotations/series?search=${encodeURIComponent(savedV2.quoteNumber)}&ownerId=${owner.user.id}`, "GET", undefined, admin)).data.series.length, 1);

  assert.equal((await request(`/api/quotations/${savedV2.id}/status`, "PATCH", { status: "REJECTED" }, owner)).response.status, 200);
  assert.equal((await request(`/api/opportunities/${opportunity.data.id}`, "GET", undefined, owner)).data.outcome, null);
  const rejectedRevision = await request(`/api/quotations/${savedV2.id}/revisions`, "POST", undefined, owner);
  assert.equal(rejectedRevision.response.status, 201);
  assert.equal(rejectedRevision.data.version, 3);
  assert.equal(rejectedRevision.data.current, false);
  const rejectedSeries = await request(`/api/quotations/series?search=${encodeURIComponent(savedV2.quoteNumber)}&status=REJECTED`, "GET", undefined, owner);
  assert.equal(rejectedSeries.data.series[0].versionCount, 3);
  assert.equal(rejectedSeries.data.series[0].id, savedV2.id);
  const lost = await request(`/api/opportunities/${opportunity.data.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "LOST" }, owner);
  assert.equal(lost.response.status, 200);
  assert.equal(lost.data.outcome, "LOST");

  const acceptedOpportunity = await request("/api/opportunities", "POST", { ...input, title: `Accepted quotation ${suffix}` }, owner);
  assert.equal(acceptedOpportunity.response.status, 201);
  created.opportunityIds.push(acceptedOpportunity.data.id);
  const acceptedHistory = await request(`/api/quotations?opportunityId=${acceptedOpportunity.data.id}`, "GET", undefined, owner);
  const acceptedQuote = acceptedHistory.data.quotations[0];
  assert.equal((await request(`/api/quotations/${acceptedQuote.id}/status`, "PATCH", { status: "SENT" }, owner)).response.status, 200);
  assert.equal((await request(`/api/quotations/${acceptedQuote.id}/status`, "PATCH", { status: "ACCEPTED" }, owner)).response.status, 200);
  assert.equal((await request(`/api/opportunities/${acceptedOpportunity.data.id}`, "GET", undefined, owner)).data.outcome, null);
  const won = await request(`/api/opportunities/${acceptedOpportunity.data.id}/stage`, "PATCH", { stage: "CLOSED", outcome: "WON", confirmedAmount: acceptedQuote.totalAmount, confirmedCurrency: "KES" }, owner);
  assert.equal(won.response.status, 200);
  assert.equal(won.data.outcome, "WON");
  assert.equal(Number(won.data.confirmedAmount), Number(acceptedQuote.totalAmount));
  console.log("PASS: product pricing, immutable versions, series grouping, effective filters, ownership, rejected revisions, isolated quotation decisions, and explicit Won/Lost outcomes");
} finally {
  await prisma.quotation.deleteMany({ where: { opportunityId: { in: created.opportunityIds } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: created.opportunityIds } } });
  await prisma.client.deleteMany({ where: { id: { in: created.clientIds } } });
  await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  await prisma.$disconnect();
}
