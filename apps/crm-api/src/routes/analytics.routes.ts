import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { decisionSupport, overview, modelPerformance } from "../controllers/analytics.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/overview", overview);
router.get("/decision-support", decisionSupport);
router.get("/model-performance", requireRole("ADMIN"), modelPerformance);

export default router;
