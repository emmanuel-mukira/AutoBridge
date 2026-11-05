import { Router, type Response } from "express";
import { prisma } from "../client.js";
import { login, publicUser } from "../services/authService.js";
import { UserAdministrationService, accountStatus, isDuplicate } from "../services/userAdministrationService.js";
import { ChangePasswordSchema, CreateUserSchema, LoginSchema, RegisterSchema, ResetPasswordSchema, UpdateUserSchema, UserIdSchema, UserStatusSchema } from "../schemas/auth.schemas.js";
import { clearSessionCookie, csrfToken, requireAuth, requireCsrf, requireRole, requireTrustedOrigin, setSessionCookie } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();
const users = new UserAdministrationService();
const admin = [requireTrustedOrigin, requireAuth, requireCsrf, requireRole("ADMIN")] as const;

function userResult<T extends { active: boolean; approvedAt: Date | null }>(user: T) {
  return { ...user, status: accountStatus(user) };
}

function accountError(error: unknown, res: Response) {
  if (isDuplicate(error)) return res.status(409).json({ error: "An account with that email already exists" });
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, [number, string]> = {
    USER_NOT_FOUND: [404, "User not found"], SELF_DISABLE: [409, "You cannot disable your own account"],
    LAST_ACTIVE_ADMIN: [409, "At least one active administrator is required"],
    INVALID_CURRENT_PASSWORD: [400, "Current password is incorrect"], PASSWORD_UNCHANGED: [400, "Choose a different new password"],
  };
  const known = messages[code];
  return known ? res.status(known[0]).json({ error: known[1] }) : null;
}

router.post("/register", requireTrustedOrigin, rateLimit({ windowMs: 15 * 60_000, max: 5 }), async (req, res, next) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid registration data", details: parsed.error.flatten() });
  try {
    await users.register(parsed.data);
    res.status(201).json({ message: "Registration received. An administrator must approve your account before you can sign in." });
  } catch (error) { if (!accountError(error, res)) next(error); }
});

router.post("/login", requireTrustedOrigin, rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res, next) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid login data" });
  try {
    const result = await login(parsed.data.email, parsed.data.password);
    if (!result) return void res.status(401).json({ error: "Invalid credentials or account unavailable" });
    setSessionCookie(res, result.token);
    res.json({ user: result.user, csrfToken: csrfToken(result.token) });
  } catch (error) { next(error); }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user!), csrfToken: csrfToken(req.user!.sessionToken) });
});

router.post("/logout", requireTrustedOrigin, requireAuth, requireCsrf, async (req, res, next) => {
  try {
    await prisma.session.update({ where: { id: req.user!.sessionId }, data: { revokedAt: new Date() } });
    clearSessionCookie(res);
    res.status(204).send();
  } catch (error) { next(error); }
});

router.patch("/password", requireTrustedOrigin, requireAuth, requireCsrf, async (req, res, next) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid password data", details: parsed.error.flatten() });
  try { res.json({ user: await users.changePassword(req.user!.id, req.user!.sessionId, parsed.data.currentPassword, parsed.data.newPassword) }); }
  catch (error) { if (!accountError(error, res)) next(error); }
});

router.get("/users", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try { res.json({ users: (await users.list()).map(userResult) }); } catch (error) { next(error); }
});

router.post("/users", ...admin, async (req, res, next) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid user data", details: parsed.error.flatten() });
  try { res.status(201).json({ user: userResult(await users.create(parsed.data)) }); }
  catch (error) { if (!accountError(error, res)) next(error); }
});

router.patch("/users/:id", ...admin, async (req, res, next) => {
  const id = UserIdSchema.safeParse(req.params); const data = UpdateUserSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid user data" });
  try { res.json({ user: userResult(await users.update(req.user!.id, id.data.id, data.data)) }); }
  catch (error) { if (!accountError(error, res)) next(error); }
});

router.patch("/users/:id/status", ...admin, async (req, res, next) => {
  const id = UserIdSchema.safeParse(req.params); const data = UserStatusSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid user status" });
  try { res.json({ user: userResult(await users.setStatus(req.user!.id, id.data.id, data.data.status)) }); }
  catch (error) { if (!accountError(error, res)) next(error); }
});

router.post("/users/:id/reset-password", ...admin, async (req, res, next) => {
  const id = UserIdSchema.safeParse(req.params); const data = ResetPasswordSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid temporary password", details: data.success ? undefined : data.error.flatten() });
  try { res.json({ user: userResult(await users.resetPassword(id.data.id, data.data.temporaryPassword)) }); }
  catch (error) { if (!accountError(error, res)) next(error); }
});

export default router;
