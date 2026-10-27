import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../client.js";
import { login, publicUser } from "../services/authService.js";
import { clearSessionCookie, csrfToken, requireAuth, requireCsrf, requireRole, requireTrustedOrigin, setSessionCookie } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const createUserSchema = z.object({
  email: z.string().email(), firstName: z.string().trim().min(1), lastName: z.string().trim().min(1),
  password: z.string().min(12), role: z.enum(["ADMIN", "SALES_REP"]),
});

router.post("/login", requireTrustedOrigin, rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid login data" });
  try {
    const result = await login(parsed.data.email, parsed.data.password);
    if (!result) return void res.status(401).json({ error: "Invalid credentials" });
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

router.post("/users", requireTrustedOrigin, requireAuth, requireCsrf, requireRole("ADMIN"), async (req, res, next) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid user data" });
  try {
    const user = await prisma.user.create({ data: {
      email: parsed.data.email.toLowerCase(),
      firstName: parsed.data.firstName, lastName: parsed.data.lastName,
      passwordHash: await bcrypt.hash(parsed.data.password, 12), role: parsed.data.role,
    } });
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
