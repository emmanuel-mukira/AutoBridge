import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listUsers,
  provisionUser,
  changeUserRole,
  changeUserStatus,
  inviteUser,
} from "../controllers/users.admin.controller.js";

const router = Router();

router.use(requireAuth());
router.use(requireRole("admin"));

router.get("/users", listUsers);
router.post("/users", provisionUser);
router.post("/users/:id/invite", inviteUser);
router.patch("/users/:id/role", changeUserRole);
router.patch("/users/:id/status", changeUserStatus);

export default router;
