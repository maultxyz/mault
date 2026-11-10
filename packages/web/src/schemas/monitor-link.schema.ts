import { CARD_HOLD_MINUTES, MONITOR_LINK_EXPIRY_DAYS } from "@magic-vault/shared";
import { z } from "zod";

export const monitorLinkSchema = z.object({
  expiresInDays: z
    .string()
    .refine((value) =>
      (MONITOR_LINK_EXPIRY_DAYS as readonly number[]).includes(Number(value)),
    ),
  showPrices: z.boolean(),
  allowHolds: z.boolean(),
  holdMinutes: z
    .string()
    .refine((value) =>
      (CARD_HOLD_MINUTES as readonly number[]).includes(Number(value)),
    ),
});

export type MonitorLinkFormValues = z.infer<typeof monitorLinkSchema>;
