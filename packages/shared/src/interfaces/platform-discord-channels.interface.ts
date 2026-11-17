import type { PLATFORM_DISCORD_CHANNEL_KEYS } from "../constants/platform-discord-channels.constant";
import type { DiscordGuildInfo } from "./integrations.interface";

export type PlatformDiscordChannelKey =
  (typeof PLATFORM_DISCORD_CHANNEL_KEYS)[number];

export interface PlatformDiscordChannel {
  guildId: string | null;
  channelId: string | null;
}

export type PlatformDiscordChannelsSettings = Record<
  PlatformDiscordChannelKey,
  PlatformDiscordChannel
>;

export interface PlatformDiscordGuildSummary {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface AdminPlatformDiscordChannelsResponse {
  settings: PlatformDiscordChannelsSettings;
  botReachable: boolean;
  guilds: PlatformDiscordGuildSummary[];
}

export type AdminPlatformDiscordGuildResponse = DiscordGuildInfo;

export interface PlatformDiscordLinkedRole {
  guildId: string | null;
  roleId: string | null;
}
