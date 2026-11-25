import assert from "node:assert/strict";
import express from "express";
import { clearSessionCookie, setSessionCookie, requireTrustedOrigin, requireCsrf } from "../dist/src/middleware/auth.js";
import { prisma } from "../dist/src/client.js";

const originalMode = process.env.NODE_ENV;
try {
  for (const mode of ["production", "development"]) {
    process.env.NODE_ENV = mode;
    for (const operation of [setSessionCookie, clearSessionCookie]) {
      const res = Object.create(express.response);
      res.req = {};
      const headers = new Map();
      res.getHeader = key => headers.get(key.toLowerCase());
      res.setHeader = (key, value) => headers.set(key.toLowerCase(), value);
      operation(res, "test-session-token");
      const value = headers.get("set-cookie");
      const cookie = Array.isArray(value) ? value[0] : value;
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /Path=\//);
      assert.match(cookie, mode === "production" ? /SameSite=None/ : /SameSite=Lax/);
      assert.equal(cookie.includes("Secure"), mode === "production");
      if (operation === clearSessionCookie) assert.match(cookie, /Expires=Thu, 01 Jan 1970/);
    }
  }
  let rejected;
  const res = { status(code) { rejected = code; return this; }, json() {} };
  requireTrustedOrigin({ header: () => "https://untrusted.invalid" }, res, () => assert.fail("Untrusted origin allowed"));
  assert.equal(rejected, 403);
  requireCsrf({ user: {}, header: () => undefined }, res, () => assert.fail("Missing CSRF token allowed"));
  assert.equal(rejected, 403);
  console.log("PASS: production/development cookie creation and clearing; origin and CSRF rejection");
} finally {
  if (originalMode === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalMode;
  await prisma.$disconnect();
}
