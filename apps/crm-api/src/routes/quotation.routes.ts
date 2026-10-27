import { Router } from "express";
import {
  requireAuth,
  requireCsrf,
  requireTrustedOrigin,
} from "../middleware/auth.js";
import * as controller from "../controllers/quotation.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.patch("/:id", requireTrustedOrigin, requireCsrf, controller.update);
router.post(
  "/:id/revisions",
  requireTrustedOrigin,
  requireCsrf,
  controller.revise,
);
router.patch(
  "/:id/status",
  requireTrustedOrigin,
  requireCsrf,
  controller.updateStatus,
);
export default router;
