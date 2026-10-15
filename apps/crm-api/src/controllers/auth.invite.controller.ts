import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../client.js";
import { sendInviteEmail } from "../utils/mailer.js";
import { autheliaUsersService } from "../services/autheliaUsers.service.js";
import {
  AcceptInviteSchema,
  ValidateInviteSchema,
  SendInviteSchema,
} from "../schemas/auth.schemas.js";

interface InviteUserRecord {
  id: number;
  companyId: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  inviteToken: string | null;
  inviteExpires: Date | null;
}

export async function acceptInvite(req: Request, res: Response) {
  const parsed = AcceptInviteSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload" });

  const { token, password } = parsed.data;

  const user = (await prisma.user.findFirst({
    where: { inviteToken: token },
    select: {
      id: true,
      companyId: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      inviteToken: true,
      inviteExpires: true,
    },
  })) as InviteUserRecord | null;

  if (!user) return res.status(400).json({ error: "Invalid or expired token" });

  if (user.inviteExpires && user.inviteExpires.getTime() < Date.now()) {
    return res.status(400).json({ error: "Invite token expired" });
  }

  if (user.status !== "PENDING") {
    return res.status(400).json({ error: `Account is ${user.status}` });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: "ACTIVE",
      inviteToken: null,
      inviteExpires: null,
      requirePasswordReset: false,
    },
    select: {
      id: true,
      email: true,
    },
  });

  // Add user to Authelia users_database.yml
  try {
    const username = autheliaUsersService.generateUsername(
      user.email,
      user.firstName,
      user.lastName
    );
    
    const displayName = `${user.firstName} ${user.lastName}`.trim();
    
    // Default to sales_rep group - can be updated by admin later
    const groups = autheliaUsersService.mapRoleToGroups("sales_rep");

    await autheliaUsersService.addOrUpdateUser({
      username,
      email: user.email,
      displayName,
      password,
      groups,
    });
  } catch (error) {
    // Log error but don't fail the invite acceptance
    // The user can still be added manually if needed
    console.error("Failed to add user to Authelia:", error);
  }

  await prisma.auditLog
    .create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "INVITE_ACCEPTED",
        description:
          "User accepted invite and set password — account activated",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] ?? undefined,
      },
    })
    .catch(() => {});

  return res.json({
    message: "Account activated. Sign in via your organisation SSO portal.",
    user: {
      id: updated.id,
      email: updated.email,
    },
  });
}

export async function validateInvite(req: Request, res: Response) {
  const parsed = ValidateInviteSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid token parameter" });

  const { token } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { inviteToken: token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      inviteExpires: true,
    },
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  if (user.inviteExpires && user.inviteExpires.getTime() < Date.now()) {
    return res.status(400).json({ error: "Invite token expired" });
  }

  if (user.status !== "PENDING") {
    return res.status(400).json({ error: `Account is already ${user.status}` });
  }

  return res.json({
    valid: true,
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  });
}

export async function sendInvite(req: Request, res: Response) {
  const parsed = SendInviteSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload" });

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      companyId: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      inviteToken: token,
      inviteExpires: expires,
      status: "PENDING",
      requirePasswordReset: true,
    },
  });

  // TODO: Switch to Authelia email delivery
  // For now, keep using the existing mailer until Authelia email templates are set up
  await sendInviteEmail(
    user.email,
    `${user.firstName} ${user.lastName}`.trim(),
    token,
  );

  await prisma.auditLog
    .create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "INVITE_SENT",
        description: `Invite sent to ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] ?? undefined,
      },
    })
    .catch(() => {});

  return res.json({ ok: true });
}
