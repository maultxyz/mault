import type { PLATFORM_STAT_KEYS } from "../constants/platform-stats.constant";

export type PlatformStatKey = (typeof PLATFORM_STAT_KEYS)[number];

export type PlatformStatValues = Record<PlatformStatKey, number>;

export interface PlatformStatsSettings {
  stats: PlatformStatKey[];
}

export interface AdminPlatformStatsResponse {
  settings: PlatformStatsSettings;
  lastPostedAt: string | null;
  channelConfigured: boolean;
}
