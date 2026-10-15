import { Request, Response } from "express";
import { prisma } from "../client.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { sendInviteEmail } from "../utils/mailer.js";

const ProvisionSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z
    .string()
    .regex(
      /^\+254\d{9}$/,
      "Phone must be a Kenyan number in +254XXXXXXXXX format",
    )
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "sales_rep"]).optional(),
});

const ChangeRoleSchema = z.object({
  role: z.enum(["admin", "sales_rep"]),
});

const ChangeStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]),
});

export async function listUsers(req: Request, res: Response) {
  const user = req.user!;

  const users = await prisma.user.findMany({
    where: {
      companyId: user.companyId,
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      lastLogin: true,
    },
    orderBy: { id: "asc" },
  });
  return res.json({ users });
}

export async function provisionUser(req: Request, res: Response) {
  const parsed = ProvisionSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    const message = firstError?.message || "Invalid payload";
    return res.status(400).json({ error: message });
  }

  const { firstName, lastName, email, phone } = parsed.data;

  const emailExists = await prisma.user.findUnique({ where: { email } });
  if (emailExists)
    return res.status(409).json({ error: "Email already in use" });

  // Check phone uniqueness if phone is provided
  if (phone) {
    const phoneExists = await prisma.user
      .findFirst({ where: { phone } })
      .catch(() => null);
    if (phoneExists)
      return res.status(409).json({ error: "Phone already in use" });
  }

  const adminUser = req.user!;
  const emailTrimmed = email.trim();
  // username: derive from email local-part, e.g. john.doe@company.com → john.doe
  const username = emailTrimmed
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, ".");

  const user = await prisma.user.create({
    data: {
      companyId: adminUser.companyId,
      username,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: emailTrimmed,
      phone: phone?.trim() || "",
      passwordHash: "",
      status: "PENDING",
      requirePasswordReset: true,
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
  });

  await prisma.auditLog
    .create({
      data: {
        companyId: adminUser.companyId,
        userId: user.id,
        action: "USER_PREPROVISIONED",
        description: "User created by admin; invite not yet sent",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] ?? undefined,
      },
    })
    .catch(() => {});

  return res.status(201).json({ user });
}

export async function changeUserRole(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id))
    return res.status(400).json({ error: "Invalid user id" });
  const parsed = ChangeRoleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid role" });

  const adminUser = req.user!;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!targetUser || targetUser.companyId !== adminUser.companyId) {
    return res.status(404).json({ error: "User not found" });
  }

  // Role changes are now managed in Authelia users_database.yml (group membership).
  // This endpoint updates the audit log so the change is recorded, but no DB role column exists.
  await prisma.auditLog
    .create({
      data: {
        companyId: adminUser.companyId,
        userId: id,
        action: "ROLE_CHANGED",
        description: `Role changed to ${parsed.data.role} (update Authelia users_database.yml to apply)`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] ?? undefined,
      },
    })
    .catch(() => {});

  const user = await prisma.user
    .findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    })
    .catch(() => null);
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({
    user,
    note: `Update Authelia users_database.yml: set group to '${parsed.data.role}' for username '${user.username}'`,
  });
}

export async function inviteUser(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id))
    return res.status(400).json({ error: "Invalid user id" });

  const adminUser = req.user!;

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { status: true, companyId: true },
  });

  if (!existingUser || existingUser.companyId !== adminUser.companyId) {
    return res.status(404).json({ error: "User not found" });
  }

  if (existingUser.status === "ACTIVE") {
    return res.status(400).json({
      error: "Cannot send invite to active user. User already has access.",
    });
  }

  const inviteToken = randomUUID();
  const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const user = await prisma.user
    .update({
      where: { id },
      data: {
        inviteToken,
        inviteExpires,
        status: "PENDING",
        passwordHash: "",
        requirePasswordReset: true,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        inviteToken: true,
        inviteExpires: true,
      },
    })
    .catch(() => null);

  if (!user) return res.status(404).json({ error: "User not found" });

  // Fire-and-forget email (MVP)
  if (user.inviteToken) {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    sendInviteEmail(user.email, fullName, user.inviteToken).catch(() => {});
  }

  await prisma.auditLog
    .create({
      data: {
        companyId: adminUser.companyId,
        userId: id,
        action: "INVITE_SENT",
        description: "Invite sent; password and sessions cleared",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] ?? undefined,
      },
    })
    .catch(() => {});

  // For development, return token so it can be used in Thunder Client
  return res.json({ user });
}

export async function changeUserStatus(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id))
    return res.status(400).json({ error: "Invalid user id" });
  const parsed = ChangeStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status" });

  const adminUser = req.user!;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!targetUser || targetUser.companyId !== adminUser.companyId) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = await prisma.user
    .update({
      where: { id },
      data: { status: parsed.data.status },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    })
    .catch(() => null);
  if (!user) return res.status(404).json({ error: "User not found" });

  await prisma.auditLog
    .create({
      data: {
        companyId: adminUser.companyId,
        userId: id,
        action: "STATUS_CHANGED",
        description: `Status changed to ${parsed.data.status}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] ?? undefined,
      },
    })
    .catch(() => {});

  return res.json({ user });
}
