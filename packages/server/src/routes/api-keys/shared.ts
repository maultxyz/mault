import {
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPE,
} from "@magic-vault/shared";
import { z } from "zod";

export const apiKeyInputSchema = z.object({
  name: z.string().trim().min(1).max(API_KEY_NAME_MAX_LENGTH),
  scope: z.enum(API_KEY_SCOPES).default(DEFAULT_API_KEY_SCOPE),
});
