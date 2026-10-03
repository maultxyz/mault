import { DEVICE_NAME_MAX_LENGTH } from "@magic-vault/shared";
import { z } from "zod";

export const renameDeviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(
      DEVICE_NAME_MAX_LENGTH,
      `Name must be ${DEVICE_NAME_MAX_LENGTH} characters or less`,
    ),
});

export type RenameDeviceFormValues = z.infer<typeof renameDeviceSchema>;
