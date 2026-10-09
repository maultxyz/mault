import {
  WEBHOOK_DESCRIPTION_MAX_LENGTH,
  WEBHOOK_EVENTS,
  WEBHOOK_URL_MAX_LENGTH,
} from "@magic-vault/shared";
import { z } from "zod";

export const webhookSchema = z.object({
  url: z
    .string()
    .trim()
    .max(WEBHOOK_URL_MAX_LENGTH)
    .refine((value) => URL.canParse(value), "webhooks.invalidUrl"),
  description: z.string().trim().max(WEBHOOK_DESCRIPTION_MAX_LENGTH),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

export type WebhookFormValues = z.infer<typeof webhookSchema>;
