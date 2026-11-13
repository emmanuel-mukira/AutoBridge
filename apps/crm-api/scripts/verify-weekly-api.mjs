import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/client.js";
import { WeeklyAllocationService } from "../dist/src/services/weeklyAllocationService.js";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const origin =
  process.env.FRONTEND_ORIGIN?.split(",")[0] || "http://127.0.0.1:5173";
const monday = new Date(Date.UTC(2099, 0, 1));
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const weekStart = monday.toISOString().slice(0, 10);
const path = `/api/weekly-allocation/${weekStart}`;
let created = false;
let userId;

async function request(url, method = "GET", body, session) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      Origin: origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(session
        ? { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}

try {
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  assert.equal((await request(path)).status, 401);
  const login = await request("/api/auth/login", "POST", {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  assert.equal(login.status, 200);
  userId = login.data.user.id;
  const session = { cookie: login.cookie, csrfToken: login.data.csrfToken };
  assert.equal(
    (
      await request(
        "/api/weekly-allocation/2099-01-01",
        "GET",
        undefined,
        session,
      )
    ).status,
    400,
  );
  assert.equal((await request(path, "GET", undefined, session)).status, 200);
  const rep = await prisma.user.findFirst({ where: { role: "SALES_REP", active: true }, select: { id: true } });
  if (rep) {
    assert.equal((await request(`${path}?ownerId=${rep.id}`, "GET", undefined, session)).status, 200);
    await assert.rejects(new WeeklyAllocationService().ownerId({ id: rep.id, role: "SALES_REP" }, userId), /FORBIDDEN_OWNER/);
  }
  assert.equal((await request(`${path}?ownerId=99999999`, "GET", undefined, session)).status, 403);
  assert.equal(
    (
      await request(
        "/api/weekly-allocation/2020-01-06/capacity",
        "PUT",
        { availableMinutes: 120 },
        session,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `${path}/capacity`,
        "PUT",
        { availableMinutes: 120 },
        { cookie: session.cookie, csrfToken: null },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `${path}/capacity`,
        "PUT",
        { availableMinutes: 17 },
        session,
      )
    ).status,
    400,
  );
  const existing = await prisma.weeklySalesCapacity.findUnique({
    where: { userId_weekStart: { userId, weekStart: monday } },
  });
  assert.equal(
    existing,
    null,
    "Temporary verification week already has capacity; choose another week",
  );
  assert.equal(
    (
      await request(
        `${path}/capacity`,
        "PUT",
        { availableMinutes: 900 },
        session,
      )
    ).status,
    200,
  );
  created = true;
  const savedPlan = await request(path, "GET", undefined, session);
  assert.equal(savedPlan.data.availableMinutes, 900);
  assert.equal((await request(`${path}/capacity`, "PUT", { availableMinutes: 960 }, session)).status, 200);
  assert.equal((await request(path, "GET", undefined, session)).data.availableMinutes, 960);
  const generated = await request(
    `${path}/recommendations`,
    "POST",
    {},
    session,
  );
  assert.equal(generated.status, 200);
  assert.equal(generated.data.status, "READY");
  assert.ok(generated.data.allocatedMinutes <= generated.data.remainingMinutes);
  assert.equal(generated.data.comparisons.length, 4);
  assert.equal(
    (
      await request(
        `${path}/recommendations`,
        "POST",
        { overrides: [{ opportunityId: 99999999, effortMinutes: 30 }] },
        session,
      )
    ).status,
    400,
  );
  console.log(
    "PASS: weekly allocation auth, CSRF, UTC week, validation, capacity persistence, recommendation and cleanup",
  );
} finally {
  if (created)
    await prisma.weeklySalesCapacity.deleteMany({
      where: { userId, weekStart: monday },
    });
  await prisma.$disconnect();
}
