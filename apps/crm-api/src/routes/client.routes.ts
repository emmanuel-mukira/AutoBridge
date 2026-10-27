import { Router } from "express";
import { requireAuth, requireCsrf, requireTrustedOrigin } from "../middleware/auth.js";
import * as controller from "../controllers/client.controller.js";
import * as salesHistoryController from "../controllers/clientSalesHistory.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", controller.list);
router.get("/owners", controller.owners);
router.get("/:id/sales-history", salesHistoryController.get);
router.post("/:id/revenue-coverage", requireTrustedOrigin, requireCsrf, salesHistoryController.verifyCoverage);
router.get("/:id", controller.getById);
router.post("/", requireTrustedOrigin, requireCsrf, controller.create);
router.patch("/:id", requireTrustedOrigin, requireCsrf, controller.update);
router.delete("/:id", requireTrustedOrigin, requireCsrf, controller.deleteClient);
export default router;
