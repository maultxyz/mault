import type { TFunction } from "i18next";
import { z } from "zod";

export const updateNameSchema = z.object({ name: z.string().trim().min(1) });

export type UpdateNameFormValues = z.infer<typeof updateNameSchema>;

export const changeEmailSchema = z.object({
  newEmail: z.string().trim().email(),
});

export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>;

export function createChangePasswordSchema(t: TFunction<"account">) {
  return z
    .object({
      currentPassword: z.string().min(1, t("password.currentRequired")),
      newPassword: z.string().min(8, t("password.tooShort")),
      confirmPassword: z.string(),
      revokeOtherSessions: z.boolean(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("password.mismatch"),
      path: ["confirmPassword"],
    });
}

export type ChangePasswordFormValues = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;
