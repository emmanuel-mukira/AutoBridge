import { NextFunction, Request, Response } from "express";
import logger from "../lib/logger.js";

/**
 * DEV-ONLY middleware that mimics Traefik's ForwardAuth behaviour.
 *
 * In production, Traefik calls Authelia's /api/verify endpoint on every
 * request and injects Remote-* headers into the upstream request.
 * Locally there is no Traefik, so this middleware does the same thing:
 *
 *   1. Reads the `authelia_session` cookie from the browser request.
 *   2. Calls http://127.0.0.1:9091/api/verify with that cookie.
 *   3. If Authelia responds 200, copies the Remote-* response headers
 *      into the Express request so requireAuth works unchanged.
 *   4. If Authelia responds 401 / error, passes through — requireAuth
 *      will reject the request as normal.
 *
 * This file is only imported when NODE_ENV !== 'production'.
 */

const AUTHELIA_VERIFY_URL =
  process.env.AUTHELIA_VERIFY_URL ?? "http://127.0.0.1:9091/api/verify";

export function devAutheliaProxy() {
  logger.info(
    { verifyUrl: AUTHELIA_VERIFY_URL },
    "[DEV] Authelia verify proxy enabled — mimicking Traefik ForwardAuth",
  );

  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Skip if Remote-Email already present (e.g. from curl with manual headers)
    if (req.headers["remote-email"]) {
      next();
      return;
    }

    const sessionCookie = req.cookies?.authelia_session;
    if (!sessionCookie) {
      next();
      return;
    }

    try {
      const verifyRes = await fetch(AUTHELIA_VERIFY_URL, {
        method: "GET",
        headers: {
          cookie: `authelia_session=${sessionCookie}`,
        },
        redirect: "manual",
      });

      if (verifyRes.status === 200) {
        const remoteUser = verifyRes.headers.get("remote-user");
        const remoteEmail = verifyRes.headers.get("remote-email");
        const remoteGroups = verifyRes.headers.get("remote-groups");
        const remoteName = verifyRes.headers.get("remote-name");

        if (remoteEmail) req.headers["remote-email"] = remoteEmail;
        if (remoteUser) req.headers["remote-user"] = remoteUser;
        if (remoteGroups) req.headers["remote-groups"] = remoteGroups;
        if (remoteName) req.headers["remote-name"] = remoteName;

        logger.debug(
          { remoteUser, remoteEmail, remoteGroups },
          "[DEV] Authelia verify success — injected Remote-* headers",
        );
      }
    } catch (err) {
      logger.debug({ err }, "[DEV] Authelia verify call failed — passing through");
    }

    next();
  };
}
