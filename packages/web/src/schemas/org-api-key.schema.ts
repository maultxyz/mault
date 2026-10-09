import { API_KEY_NAME_MAX_LENGTH } from "@magic-vault/shared";
import { z } from "zod";

export const orgApiKeySchema = z.object({
  name: z.string().trim().min(1).max(API_KEY_NAME_MAX_LENGTH),
  allowWrite: z.boolean(),
});

export type OrgApiKeyFormValues = z.infer<typeof orgApiKeySchema>;
