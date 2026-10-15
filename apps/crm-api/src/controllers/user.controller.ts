import { Request, Response } from "express";
import { prisma } from "../client.js";

/**
 * GET /api/user/me
 * Returns user info for UI bootstrapping.
 * req.user is populated by requireAuth middleware from Authelia Remote-* headers.
 * Enriched with firstName/lastName from the database.
 */
export async function me(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { firstName: true, lastName: true },
    });

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        groups: req.user.groups,
        companyId: req.user.companyId,
      },
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}
