import { z } from "zod";
import { formValidationMessage } from "@magic-vault/shared";

export const verifyEmailSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, formValidationMessage("verificationCodeLength", { length: 6 }))
    .regex(/^\d+$/, formValidationMessage("verificationCodeNumeric")),
});

export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
