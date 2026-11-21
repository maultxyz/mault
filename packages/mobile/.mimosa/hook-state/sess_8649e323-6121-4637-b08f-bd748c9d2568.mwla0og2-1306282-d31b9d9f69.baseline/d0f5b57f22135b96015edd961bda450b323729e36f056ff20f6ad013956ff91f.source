import type { ChannelLayout, ScanRegion } from "@magic-vault/shared";

export interface Device {
  guid: string;
  name: string;
  hardwareId: string | null;
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  matchesNeeded: number;
  checkBothOrientations: boolean;
  moduleCount: number;
  channelLayout: ChannelLayout;
  setupCompletedAt: string | null;
  pipelinedFeed: boolean;
  autoConnect: boolean;
  testOnConnect: boolean;
}
