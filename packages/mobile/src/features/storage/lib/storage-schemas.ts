import { z } from "zod";
import { STORAGE_LOCATION_NAME_MAX_LENGTH } from "@magic-vault/shared";

export const storageNameSchema = z.object({
  name: z.string().trim().min(1).max(STORAGE_LOCATION_NAME_MAX_LENGTH),
});
