import type { PlatformStatsSettings } from "@magic-vault/shared";

export interface StoredPlatformStatsSettings extends PlatformStatsSettings {
  lastPostedAt: Date | null;
}

export type PlatformStatsPostOutcome =
  | "sent"
  | "not_configured"
  | "failed";
