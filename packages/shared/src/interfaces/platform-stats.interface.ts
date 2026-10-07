import type { PLATFORM_STAT_KEYS } from "../constants/platform-stats.constant";
import type { DiscordGuildInfo } from "./integrations.interface";

export type PlatformStatKey = (typeof PLATFORM_STAT_KEYS)[number];

export type PlatformStatValues = Record<PlatformStatKey, number>;

export interface PlatformStatsSettings {
  guildId: string | null;
  channelId: string | null;
  stats: PlatformStatKey[];
}

export interface PlatformStatsGuildSummary {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface AdminPlatformStatsResponse {
  settings: PlatformStatsSettings;
  lastPostedAt: string | null;
  botReachable: boolean;
  guilds: PlatformStatsGuildSummary[];
}

export type AdminPlatformStatsGuildResponse = DiscordGuildInfo;
