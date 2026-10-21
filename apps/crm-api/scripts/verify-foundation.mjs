import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../dist/src/client.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const suffix = randomUUID();
const created = { accounts: [], users: [], contacts: [] };

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
  const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  assert.ok(result.data.csrfToken);
  return { cookie, csrfToken: result.data.csrfToken, user: result.data.user };
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Development administrator credentials are required in local .env");
  assert.equal((await request("/api/accounts")).response.status, 401);
  assert.equal((await request("/api/auth/login", "POST", { email: process.env.ADMIN_EMAIL, password: "incorrect" })).response.status, 401);

  const admin = await signIn(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  assert.equal(admin.user.role, "ADMIN");
  assert.equal(admin.user.email, process.env.ADMIN_EMAIL.trim().toLowerCase());
  assert.equal(admin.user.firstName, process.env.ADMIN_FIRST_NAME);
  assert.equal(admin.user.lastName, process.env.ADMIN_LAST_NAME);
  assert.equal((await request("/api/auth/me", "GET", undefined, admin)).response.status, 200);
  assert.ok((await request("/api/accounts/owners", "GET", undefined, admin)).data.owners.some((owner) => owner.id === admin.user.id));
  const withoutCsrf = await fetch(`${base}/api/accounts`, { method: "POST", headers: { Cookie: admin.cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ businessName: "No CSRF" }) });
  assert.equal(withoutCsrf.status, 403);

  const account = await request("/api/accounts", "POST", { businessName: `Foundation ${suffix}`, countyName: "Nairobi", locationAddress: "Test Street" }, admin);
  assert.equal(account.response.status, 201);
  created.accounts.push(account.data.id);
  assert.equal((await prisma.account.findUnique({ where: { id: account.data.id } }))?.businessName, account.data.businessName);
  assert.ok((await request("/api/accounts", "GET", undefined, admin)).data.accounts.some((item) => item.id === account.data.id));
  assert.equal((await request(`/api/accounts/${account.data.id}`, "GET", undefined, admin)).data.id, account.data.id);
  assert.equal((await request(`/api/accounts/${account.data.id}`, "PATCH", { countyName: "Kiambu" }, admin)).data.countyName, "Kiambu");
  assert.equal((await request("/api/accounts", "POST", { businessName: "" }, admin)).response.status, 400);

  const repEmail = `rep-${suffix}@example.test`;
  const repPassword = randomUUID() + "-test";
  const repResult = await request("/api/auth/users", "POST", { email: repEmail, password: repPassword, firstName: "Test", lastName: "Rep", role: "SALES_REP" }, admin);
  assert.equal(repResult.response.status, 201);
  created.users.push(repResult.data.user.id);
  const rep = await signIn(repEmail, repPassword);
  assert.deepEqual((await request("/api/accounts/owners", "GET", undefined, rep)).data.owners.map((owner) => owner.id), [rep.user.id]);
  assert.equal((await request("/api/auth/users", "POST", { email: `no-${suffix}@example.test`, password: repPassword, firstName: "No", lastName: "Access", role: "ADMIN" }, rep)).response.status, 403);
  assert.equal((await request(`/api/accounts/${account.data.id}`, "GET", undefined, rep)).response.status, 404);
  assert.equal((await request("/api/contacts", "POST", { accountId: account.data.id, firstName: "Denied", lastName: "Rep" }, rep)).response.status, 404);
  const adminContact = await request("/api/contacts", "POST", { accountId: account.data.id, firstName: "Admin", lastName: "Contact" }, admin);
  assert.equal(adminContact.response.status, 201);
  created.contacts.push(adminContact.data.id);
  assert.equal((await request(`/api/contacts/${adminContact.data.id}`, "GET", undefined, rep)).response.status, 404);
  assert.equal((await request(`/api/contacts/${adminContact.data.id}`, "PATCH", { title: "Denied" }, rep)).response.status, 404);
  assert.equal((await request(`/api/contacts/${adminContact.data.id}`, "DELETE", undefined, rep)).response.status, 404);
  assert.equal((await request(`/api/accounts/${account.data.id}`, "PATCH", { ownerId: rep.user.id }, admin)).data.ownerId, rep.user.id);
  assert.equal((await request(`/api/accounts/${account.data.id}`, "GET", undefined, rep)).response.status, 200);
  assert.equal((await request(`/api/accounts/${account.data.id}`, "PATCH", { ownerId: admin.user.id }, rep)).response.status, 403);
  assert.equal((await request(`/api/accounts/${account.data.id}`, "PATCH", { ownerId: admin.user.id }, admin)).data.ownerId, admin.user.id);
  assert.equal((await request(`/api/accounts/${account.data.id}`, "PATCH", { ownerId: 2147483647 }, admin)).response.status, 400);
  const repAccount = await request("/api/accounts", "POST", { businessName: `Rep ${suffix}`, countyName: "Nairobi", locationAddress: "Other Street" }, rep);
  assert.equal(repAccount.response.status, 201);
  created.accounts.push(repAccount.data.id);
  assert.equal(repAccount.data.ownerId, rep.user.id);
  const contact = await request("/api/contacts", "POST", { accountId: repAccount.data.id, firstName: "Sample", lastName: "Contact", email: "" }, rep);
  assert.equal(contact.response.status, 201);
  created.contacts.push(contact.data.id);
  assert.equal(contact.data.email, null);
  assert.equal((await request(`/api/contacts/${contact.data.id}`, "GET", undefined, rep)).response.status, 200);
  assert.equal((await request(`/api/contacts/${contact.data.id}`, "PATCH", { title: "Denied" }, admin)).response.status, 200);
  assert.equal((await request(`/api/contacts/${contact.data.id}`, "GET", undefined, admin)).response.status, 200);
  assert.equal((await request("/api/contacts", "GET", undefined, admin)).data.contacts.some((item) => item.id === contact.data.id), true);
  assert.equal((await request(`/api/contacts/${contact.data.id}`, "PATCH", { title: "Manager" }, rep)).data.title, "Manager");
  assert.equal((await request("/api/contacts", "POST", { accountId: repAccount.data.id, firstName: "Bad", lastName: "Email", email: "invalid" }, rep)).response.status, 400);
  assert.equal((await request(`/api/contacts/${contact.data.id}`, "DELETE", undefined, admin)).response.status, 204);
  created.contacts = created.contacts.filter((id) => id !== contact.data.id);
  assert.equal((await request(`/api/contacts/${contact.data.id}`, "GET", undefined, rep)).response.status, 404);
  assert.equal((await request(`/api/accounts/${repAccount.data.id}`, "DELETE", undefined, rep)).response.status, 204);
  assert.equal((await request(`/api/accounts/${repAccount.data.id}`, "GET", undefined, rep)).response.status, 404);

  assert.equal((await request("/api/auth/logout", "POST", undefined, rep)).response.status, 204);
  assert.equal((await request("/api/auth/me", "GET", undefined, rep)).response.status, 401);
  const expiring = await signIn(repEmail, repPassword);
  const rawToken = expiring.cookie.split("=")[1];
  await prisma.session.update({ where: { tokenHash: createHash("sha256").update(rawToken).digest("hex") }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await request("/api/auth/me", "GET", undefined, expiring)).response.status, 401);
  await request("/api/auth/logout", "POST", undefined, admin);
  console.log("PASS: login, rejection, CSRF, roles, owner access, account/contact CRUD, logout, expiry");
} finally {
  await prisma.contact.deleteMany({ where: { id: { in: created.contacts } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accounts } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}
