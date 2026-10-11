import {
  WEBHOOK_DESCRIPTION_MAX_LENGTH,
  WEBHOOK_EVENTS,
} from "@magic-vault/shared";
import { z } from "zod";
import { parseWebhookUrl } from "../../lib/webhooks/url-safety";

export const webhookInputSchema = z.object({
  url: z
    .string()
    .trim()
    .refine((value) => parseWebhookUrl(value) !== null, {
      message: "Enter a public https:// URL.",
    }),
  description: z
    .string()
    .trim()
    .max(WEBHOOK_DESCRIPTION_MAX_LENGTH)
    .nullable()
    .transform((value) => value || null),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1)
    .transform((events) => [...new Set(events)]),
});

export function webhookInputError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid webhook.";
}
