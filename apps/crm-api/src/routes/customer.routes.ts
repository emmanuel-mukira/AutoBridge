import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as controller from "../controllers/customer.controller.js";

const router = Router();

router.post("/", requireAuth(), controller.create);
router.get("/", requireAuth(), controller.list);
router.get("/:id", requireAuth(), controller.getById);
router.get(
  "/:id/sales-rep-history",
  requireAuth(),
  controller.getSalesRepHistory,
);
router.get(
  "/:id/interactions-by-rep",
  requireAuth(),
  controller.getInteractionsByRep,
);
router.patch("/:id", requireAuth(), controller.update);
router.delete("/:id", requireAuth(), controller.deleteCustomer);
router.patch("/:id/assign", requireAuth(), controller.assignSalesRep);

export default router;
