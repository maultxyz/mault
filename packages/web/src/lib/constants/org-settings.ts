import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  DEFAULT_SCAN_REGION,
  type ChannelLayout,
  type ScanRegion,
} from "@magic-vault/shared";

export interface OrgSettings {
  primaryColor: string | null;
  scannerLayout: "horizontal" | "vertical";
  discordNotifyOnScan: boolean;
  discordGuildId: string | null;
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  moduleCount: number;
  channelLayout: ChannelLayout;
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  primaryColor: null,
  scannerLayout: "horizontal",
  discordNotifyOnScan: false,
  discordGuildId: null,
  scanRegion: DEFAULT_SCAN_REGION,
  captureSettleDelayMs: DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  moduleCount: DEFAULT_MODULE_COUNT,
  channelLayout: DEFAULT_CHANNEL_LAYOUT,
};
