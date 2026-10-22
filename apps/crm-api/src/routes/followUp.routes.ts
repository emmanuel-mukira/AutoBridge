import { Router } from "express";
import { requireAuth, requireCsrf, requireTrustedOrigin } from "../middleware/auth.js";
import * as controller from "../controllers/followUp.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", requireTrustedOrigin, requireCsrf, controller.create);
router.patch("/:id/complete", requireTrustedOrigin, requireCsrf, controller.complete);
router.patch("/:id", requireTrustedOrigin, requireCsrf, controller.update);

export default router;
