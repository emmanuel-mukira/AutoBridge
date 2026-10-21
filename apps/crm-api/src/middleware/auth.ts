import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../client.js";

const SESSION_COOKIE = "crm_session";
const SESSION_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return value;
}

export function validateAuthConfig(): void {
  secret();
  if (!process.env.FRONTEND_ORIGIN) throw new Error("FRONTEND_ORIGIN is required");
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function csrfToken(sessionToken: string): string {
  return createHmac("sha256", secret()).update(sessionToken).digest("hex");
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_MS);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role,
      sessionId: session.id,
      sessionToken: token,
      csrfHash: session.csrfHash,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role: "ADMIN" | "SALES_REP") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return void res.status(403).json({ error: "Forbidden" });
    next();
  };
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) return void res.status(401).json({ error: "Unauthorized" });
  const received = req.header("X-CSRF-Token");
  if (!received || !/^[a-f0-9]{64}$/.test(received) || !timingSafeEqual(Buffer.from(hashToken(received)), Buffer.from(req.user.csrfHash))) {
    return void res.status(403).json({ error: "Invalid CSRF token" });
  }
  next();
}

export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header("Origin");
  const allowed = (process.env.FRONTEND_ORIGIN ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (origin && !allowed.includes(origin)) return void res.status(403).json({ error: "Origin not allowed" });
  next();
}
