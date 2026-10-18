import { PLATFORM_DISCORD_CHANNEL_KEYS } from "@magic-vault/shared";
import { z } from "zod";

const platformDiscordChannelSchema = z.object({
  guildId: z.string().nullable(),
  channelId: z.string().nullable(),
});

export const platformDiscordChannelsSchema = z.record(
  z.enum(PLATFORM_DISCORD_CHANNEL_KEYS),
  platformDiscordChannelSchema,
);

export type PlatformDiscordChannelsFormValues = z.infer<
  typeof platformDiscordChannelsSchema
>;
