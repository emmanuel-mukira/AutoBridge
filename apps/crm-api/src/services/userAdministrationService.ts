import bcrypt from "bcryptjs";
import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "../client.js";
import { publicUser } from "./authService.js";

const summarySelect = {
  id: true, email: true, firstName: true, lastName: true, role: true,
  active: true, approvedAt: true, mustChangePassword: true, createdAt: true,
  ownedClients: { where: { deletedAt: null }, select: { id: true, businessName: true }, orderBy: { businessName: "asc" as const } },
};

export class UserAdministrationService {
  async register(input: { firstName: string; lastName: string; email: string; password: string }) {
    return prisma.user.create({ data: {
      firstName: input.firstName, lastName: input.lastName,
      email: input.email.toLowerCase(), passwordHash: await bcrypt.hash(input.password, 12),
      role: "SALES_REP", active: false, approvedAt: null,
    }, select: { id: true } });
  }

  list() {
    return prisma.user.findMany({ select: summarySelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  }

  async create(input: { firstName: string; lastName: string; email: string; password: string; role: UserRole }) {
    return prisma.user.create({ data: {
      firstName: input.firstName, lastName: input.lastName, email: input.email.toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 12), role: input.role,
      active: true, approvedAt: new Date(), mustChangePassword: true,
    }, select: summarySelect });
  }

  private async protectLastAdmin(id: number, nextRole?: UserRole, disabling = false) {
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true, approvedAt: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    const removesActiveAdmin = user.role === "ADMIN" && user.active && user.approvedAt && (nextRole === "SALES_REP" || disabling);
    if (removesActiveAdmin && await prisma.user.count({ where: { role: "ADMIN", active: true, approvedAt: { not: null } } }) <= 1) throw new Error("LAST_ACTIVE_ADMIN");
  }

  async update(actorId: number, id: number, input: { firstName: string; lastName: string; email: string; role: UserRole }) {
    await this.protectLastAdmin(id, input.role);
    return prisma.user.update({ where: { id }, data: { ...input, email: input.email.toLowerCase() }, select: summarySelect });
  }

  async setStatus(actorId: number, id: number, status: "APPROVED" | "DISABLED" | "ACTIVE") {
    if (actorId === id && status === "DISABLED") throw new Error("SELF_DISABLE");
    await this.protectLastAdmin(id, undefined, status === "DISABLED");
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: status === "APPROVED"
        ? { active: true, approvedAt: new Date() }
        : status === "ACTIVE" ? { active: true } : { active: false }, select: summarySelect });
      if (status === "DISABLED") await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      return user;
    });
  }

  async resetPassword(id: number, temporaryPassword: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: {
        passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true,
      }, select: summarySelect });
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      return user;
    });
  }

  async changePassword(userId: number, currentSessionId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!await bcrypt.compare(currentPassword, user.passwordHash)) throw new Error("INVALID_CURRENT_PASSWORD");
    if (await bcrypt.compare(newPassword, user.passwordHash)) throw new Error("PASSWORD_UNCHANGED");
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false } }),
      prisma.session.updateMany({ where: { userId, id: { not: currentSessionId }, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return publicUser({ ...user, mustChangePassword: false });
  }
}

export function accountStatus(user: { active: boolean; approvedAt: Date | null }) {
  return !user.approvedAt ? "PENDING" : user.active ? "ACTIVE" : "DISABLED";
}

export function isDuplicate(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
