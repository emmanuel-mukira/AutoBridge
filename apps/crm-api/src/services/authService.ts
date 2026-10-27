import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../client.js";
import { csrfToken, hashToken, sessionExpiry } from "../middleware/auth.js";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) return null;
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({ data: { id: randomUUID(), userId: user.id, tokenHash: hashToken(token), csrfHash: hashToken(csrfToken(token)), expiresAt: sessionExpiry() } });
  return { token, user: publicUser(user) };
}

export function publicUser(user: { id: number; email: string; firstName: string; lastName: string; role: "ADMIN" | "SALES_REP" }) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, groups: [user.role === "ADMIN" ? "admin" : "sales_rep"] };
}
