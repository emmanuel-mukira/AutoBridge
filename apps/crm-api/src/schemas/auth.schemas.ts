import { z } from "zod";

export const AcceptInviteSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ValidateInviteSchema = z.object({
  token: z.string().min(10),
});

export const SendInviteSchema = z.object({
  email: z.string().email(),
});

export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export type ValidateInviteInput = z.infer<typeof ValidateInviteSchema>;
export type SendInviteInput = z.infer<typeof SendInviteSchema>;
