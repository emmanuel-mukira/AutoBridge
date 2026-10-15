import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as controller from "../controllers/auditLog.controller.js";

const router = Router();

router.get("/", requireAuth(), controller.list);
router.get("/:id", requireAuth(), controller.getById);

export default router;
