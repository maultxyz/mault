import { z } from "zod";
import { WEBHOOK_DESCRIPTION_MAX_LENGTH, WEBHOOK_EVENTS, WEBHOOK_URL_MAX_LENGTH } from "@magic-vault/shared";

export const webhookSchema = z.object({
  url: z
    .string()
    .trim()
    .max(WEBHOOK_URL_MAX_LENGTH)
    .regex(/^https:\/\/\S+$/),
  description: z.string().trim().max(WEBHOOK_DESCRIPTION_MAX_LENGTH),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});
