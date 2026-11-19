import { SHARE_LINK_PURPOSES } from "@magic-vault/shared";
import { z } from "zod";

export const monitorLinkSchema = z.object({
  purpose: z.enum(SHARE_LINK_PURPOSES),
  expiresInDays: z
    .string()
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1),
  showPrices: z.boolean(),
  requireGuestContact: z.boolean(),
});

export type MonitorLinkFormValues = z.infer<typeof monitorLinkSchema>;
