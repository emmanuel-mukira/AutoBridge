import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as controller from "../controllers/quotation.controller.js";

const router = Router();

router.post("/", requireAuth(), controller.create);
router.get("/", requireAuth(), controller.list);
router.post("/:id/version", requireAuth(), controller.createNewVersion);
router.get(
  "/history/:quoteNumber",
  requireAuth(),
  controller.getVersionHistory,
);
router.get("/:id", requireAuth(), controller.getById);
router.patch("/:id", requireAuth(), controller.update);
router.delete("/:id", requireAuth(), controller.deleteQuotation);

export default router;
