import {
  DEVICE_NAME_MAX_LENGTH,
  formValidationMessage,
} from "@magic-vault/shared";
import { z } from "zod";

export const renameDeviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(
      DEVICE_NAME_MAX_LENGTH,
      formValidationMessage("nameTooLong", { max: DEVICE_NAME_MAX_LENGTH }),
    ),
});

export type RenameDeviceFormValues = z.infer<typeof renameDeviceSchema>;
