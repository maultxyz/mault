import { MONITOR_LINK_EXPIRY_DAYS, SHARE_LINK_PURPOSES } from "@magic-vault/shared";
import { z } from "zod";

export const monitorLinkSchema = z.object({
  purpose: z.enum(SHARE_LINK_PURPOSES),
  expiresInDays: z
    .string()
    .refine((value) =>
      (MONITOR_LINK_EXPIRY_DAYS as readonly number[]).includes(Number(value)),
    ),
  showPrices: z.boolean(),
});

export type MonitorLinkFormValues = z.infer<typeof monitorLinkSchema>;
