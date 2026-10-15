import { Router } from "express";
import {
  acceptInvite,
  validateInvite,
} from "../controllers/auth.invite.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

// Invite flow — users set their password when accepting an admin invite.
// Login, MFA, password reset are all handled by the Authelia portal.
router.get("/invite/validate", validateInvite);
router.post(
  "/invite/accept",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  acceptInvite,
);

export default router;
