import { z } from "zod";

const channelIdSchema = z.string().nullable();

export const discordSettingsDraftSchema = z.object({
  scanChannelId: channelIdSchema,
  errorChannelId: channelIdSchema,
  overrides: z.record(
    z.string(),
    z.object({
      scanChannelId: channelIdSchema,
      errorChannelId: channelIdSchema,
    }),
  ),
  ruleEnabled: z.record(z.string(), z.boolean()),
  discordNotifyOnScan: z.boolean(),
  discordScanUseThreads: z.boolean(),
});

export type DiscordSettingsDraftValues = z.infer<
  typeof discordSettingsDraftSchema
>;

export type DiscordChannelsDraft =
  DiscordSettingsDraftValues["overrides"][string];
