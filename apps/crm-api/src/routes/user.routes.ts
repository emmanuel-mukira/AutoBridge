import { Router } from "express";
import { me } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/user/me - Fetch current user info (requires Authelia session)
router.get("/me", requireAuth(), me);

export default router;
