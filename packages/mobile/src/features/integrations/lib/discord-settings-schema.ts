import { z } from "zod";
import type { BinRuleGroup } from "@magic-vault/shared";

const channelIdSchema = z.string().nullable();

export const discordSettingsSchema = z.object({
  scanChannelId: channelIdSchema,
  errorChannelId: channelIdSchema,
  overrides: z.record(z.string(), z.object({ scanChannelId: channelIdSchema, errorChannelId: channelIdSchema })),
  ruleEnabled: z.record(z.string(), z.boolean()),
  discordNotifyOnScan: z.boolean(),
  discordScanUseThreads: z.boolean(),
});

export const notificationRuleSchema = z.object({
  name: z.string().trim().min(1),
  channelId: z.string().min(1),
  roleId: z.string().nullable(),
  isEnabled: z.boolean(),
  rules: z.custom<BinRuleGroup>(
    (value) => !!value && typeof value === "object" && "conditions" in value,
  ),
});
