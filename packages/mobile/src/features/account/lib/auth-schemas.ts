import { z } from "zod";

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const updateNameSchema = z.object({ name: z.string().trim().min(1) });

export const changeEmailSchema = z.object({ newEmail: z.email() });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"] });
