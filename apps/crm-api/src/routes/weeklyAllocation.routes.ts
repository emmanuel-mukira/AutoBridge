import { Router } from "express";
import {
  requireAuth,
  requireCsrf,
  requireTrustedOrigin,
} from "../middleware/auth.js";
import {
  getPlan,
  recommend,
  saveCapacity,
} from "../controllers/weeklyAllocation.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/:weekStart", getPlan);
router.put(
  "/:weekStart/capacity",
  requireTrustedOrigin,
  requireCsrf,
  saveCapacity,
);
router.post(
  "/:weekStart/recommendations",
  requireTrustedOrigin,
  requireCsrf,
  recommend,
);

export default router;
