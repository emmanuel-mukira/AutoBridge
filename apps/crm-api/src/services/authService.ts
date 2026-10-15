import { prisma } from "../client.js";
import logger from "../lib/logger.js";

export interface SignupInput {
  companyId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignupResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
}

export class AuthService {
  async signup(input: SignupInput): Promise<SignupResult> {
    const {
      companyId,
      firstName,
      lastName,
      email,
      phone,
      ipAddress,
      userAgent,
    } = input;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("EMAIL_IN_USE");
    }

    const user = await prisma.user.create({
      data: {
        companyId,
        firstName,
        lastName,
        email,
        phone,
        passwordHash: "",
        username: email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, "."),
        status: "PENDING",
        requirePasswordReset: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          companyId,
          userId: user.id,
          action: "SIGNUP_REQUESTED",
          description: "Backend user provisioning",
          ipAddress,
          userAgent,
        },
      })
      .catch(() => {});

    return user;
  }
}
