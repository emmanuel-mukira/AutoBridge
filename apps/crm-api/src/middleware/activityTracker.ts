import { Request, Response, NextFunction } from "express";

// Session lifecycle (inactivity timeout, expiry) is managed by Authelia.
// configuration.yml: session.expiration = 1h, session.inactivity = 15m.
// This middleware is a no-op passthrough kept for future audit-log hooks.
export function trackActivity(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next();
}
