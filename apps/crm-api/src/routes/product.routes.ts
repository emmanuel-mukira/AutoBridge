import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as controller from "../controllers/product.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", controller.list);
export default router;
