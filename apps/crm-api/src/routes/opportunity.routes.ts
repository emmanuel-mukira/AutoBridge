import { Router } from "express";
import { requireAuth, requireCsrf, requireTrustedOrigin } from "../middleware/auth.js";
import * as controller from "../controllers/opportunity.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/products", controller.products);
router.get("/owners", controller.owners);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", requireTrustedOrigin, requireCsrf, controller.create);
router.patch("/:id/stage", requireTrustedOrigin, requireCsrf, controller.transition);
router.patch("/:id", requireTrustedOrigin, requireCsrf, controller.update);

export default router;
