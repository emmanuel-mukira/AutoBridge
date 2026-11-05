import { z } from "zod";

export const PasswordSchema = z.string().min(6, "Password must be at least 6 characters").max(128);
export const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const RegisterSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: PasswordSchema,
});

export const CreateUserSchema = RegisterSchema.extend({ role: z.enum(["ADMIN", "SALES_REP"]) });
export const UpdateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  role: z.enum(["ADMIN", "SALES_REP"]),
});
export const UserIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const UserStatusSchema = z.object({ status: z.enum(["APPROVED", "DISABLED", "ACTIVE"]) });
export const ResetPasswordSchema = z.object({ temporaryPassword: PasswordSchema });
export const ChangePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: PasswordSchema });
