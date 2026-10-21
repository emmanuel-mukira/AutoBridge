import { Router } from "express";
import { requireAuth, requireCsrf, requireTrustedOrigin } from "../middleware/auth.js";
import * as controller from "../controllers/account.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", controller.list);
router.get("/owners", controller.owners);
router.get("/:id", controller.getById);
router.post("/", requireTrustedOrigin, requireCsrf, controller.create);
router.patch("/:id", requireTrustedOrigin, requireCsrf, controller.update);
router.delete("/:id", requireTrustedOrigin, requireCsrf, controller.deleteAccount);
export default router;
