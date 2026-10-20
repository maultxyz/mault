import {
  PLATFORM_DISCORD_CHANNEL_KEYS,
  type PlatformDiscordChannel,
  type PlatformDiscordChannelKey,
  type PlatformDiscordChannelsSettings,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { platformDiscordChannels } from "../db/schema";

const EMPTY_CHANNEL: PlatformDiscordChannel = { guildId: null, channelId: null };

export async function loadPlatformDiscordChannel(
  key: PlatformDiscordChannelKey,
): Promise<PlatformDiscordChannel> {
  const [row] = await db
    .select({
      guildId: platformDiscordChannels.guildId,
      channelId: platformDiscordChannels.channelId,
    })
    .from(platformDiscordChannels)
    .where(eq(platformDiscordChannels.key, key))
    .limit(1);
  return row ?? EMPTY_CHANNEL;
}

export async function loadPlatformDiscordChannels(): Promise<PlatformDiscordChannelsSettings> {
  const rows = await db.select().from(platformDiscordChannels);
  return Object.fromEntries(
    PLATFORM_DISCORD_CHANNEL_KEYS.map((key) => {
      const row = rows.find((r) => r.key === key);
      return [
        key,
        row
          ? { guildId: row.guildId, channelId: row.channelId }
          : EMPTY_CHANNEL,
      ];
    }),
  ) as PlatformDiscordChannelsSettings;
}

export async function savePlatformDiscordChannels(
  settings: PlatformDiscordChannelsSettings,
): Promise<PlatformDiscordChannelsSettings> {
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const key of PLATFORM_DISCORD_CHANNEL_KEYS) {
      const values = { ...settings[key], updatedAt: now };
      await tx
        .insert(platformDiscordChannels)
        .values({ key, ...values })
        .onConflictDoUpdate({ target: platformDiscordChannels.key, set: values });
    }
  });
  return loadPlatformDiscordChannels();
}
