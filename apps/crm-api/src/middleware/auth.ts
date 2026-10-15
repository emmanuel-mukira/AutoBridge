import { NextFunction, Request, Response } from "express";
import { prisma } from "../client.js";
import logger from "../lib/logger.js";

/**
 * Per-process in-memory cache for Authelia header → DB user resolution.
 * Keyed by email (from Remote-Email header). TTL: 5 minutes.
 *
 * Why: Authelia's Remote-User is a username string, NOT a numeric ID.
 * We need the numeric userId and companyId from our DB for RLS and queries.
 * Caching avoids a DB hit on every request without sacrificing freshness.
 */
interface CachedUser {
  id: number;
  companyId: number;
  expiresAt: number;
}

const USER_CACHE = new Map<string, CachedUser>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedUser(email: string): CachedUser | null {
  const entry = USER_CACHE.get(email);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    USER_CACHE.delete(email);
    return null;
  }
  return entry;
}

function setCachedUser(email: string, id: number, companyId: number): void {
  USER_CACHE.set(email, {
    id,
    companyId,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * requireAuth — Authelia forward-auth middleware.
 *
 * Traefik injects these headers after Authelia validates the session cookie:
 *   Remote-User   → Authelia username string (e.g. "john.doe") — NOT a numeric ID
 *   Remote-Groups → comma-separated group names (e.g. "admin,crm_users")
 *   Remote-Email  → user email — used to look up our DB record
 *   Remote-Name   → display name
 *
 * Traefik strips any incoming Remote-* headers from the client and only
 * re-injects them after Authelia validation, so spoofing is prevented at
 * the proxy layer. In production the backend must only be reachable via Traefik.
 *
 * We resolve numeric userId and companyId from the DB using Remote-Email,
 * with an in-memory cache to avoid a DB hit on every request.
 */
export function requireAuth() {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const remoteEmail = req.headers["remote-email"] as string | undefined;
    const remoteUser = req.headers["remote-user"] as string | undefined;
    const remoteGroups = req.headers["remote-groups"] as string | undefined;
    const remoteName = req.headers["remote-name"] as string | undefined;

    if (!remoteEmail) {
      logger.warn(
        { url: req.url },
        "Missing Remote-Email header — request not from Authelia/Traefik",
      );
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const groups = remoteGroups
      ? remoteGroups
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean)
      : [];

    const cached = getCachedUser(remoteEmail);
    if (cached) {
      req.user = {
        id: cached.id,
        username: remoteUser ?? remoteEmail,
        email: remoteEmail,
        name: remoteName ?? "",
        groups,
        companyId: cached.companyId,
      };
      next();
      return;
    }

    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: remoteEmail },
        select: { id: true, companyId: true },
      });

      if (!dbUser) {
        logger.warn({ email: remoteEmail }, "Authelia user not found in DB");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      setCachedUser(remoteEmail, dbUser.id, dbUser.companyId);

      req.user = {
        id: dbUser.id,
        username: remoteUser ?? remoteEmail,
        email: remoteEmail,
        name: remoteName ?? "",
        groups,
        companyId: dbUser.companyId,
      };

      logger.debug(
        { userId: dbUser.id, companyId: dbUser.companyId, groups },
        "Authelia auth ok",
      );
      next();
    } catch (err) {
      logger.error({ err }, "requireAuth DB lookup failed");
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * requireRole — checks that the authenticated user belongs to the required Authelia group.
 * Authelia group names in your configuration must match: "admin" | "sales_rep"
 */
export function requireRole(roleName: "admin" | "sales_rep") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!req.user.groups.includes(roleName)) {
      logger.warn(
        { userId: req.user.id, required: roleName, groups: req.user.groups },
        "Forbidden",
      );
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
