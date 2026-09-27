import { MONITOR_LINK_EXPIRY_DAYS } from "@magic-vault/shared";
import { z } from "zod";

export const monitorLinkSchema = z.object({
  expiresInDays: z
    .string()
    .refine((value) =>
      (MONITOR_LINK_EXPIRY_DAYS as readonly number[]).includes(Number(value)),
    ),
});

export type MonitorLinkFormValues = z.infer<typeof monitorLinkSchema>;
