import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as controller from "../controllers/interaction.controller.js";

const router = Router();

router.post("/", requireAuth(), controller.create);
router.get("/", requireAuth(), controller.list);
router.get("/:id", requireAuth(), controller.getById);
router.patch("/:id", requireAuth(), controller.update);
router.delete("/:id", requireAuth(), controller.deleteInteraction);
router.get("/customer/:customerId", requireAuth(), controller.getByCustomer);

export default router;
