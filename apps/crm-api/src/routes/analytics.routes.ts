import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { decisionSupport, overview } from "../controllers/analytics.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/overview", overview);
router.get("/decision-support", decisionSupport);

export default router;
