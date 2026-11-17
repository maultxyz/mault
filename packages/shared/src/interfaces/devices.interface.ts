import type { ChannelLayout } from "./module-configs.interface";
import type { ScanRegion } from "./scanner.interface";

export interface DevicePatch {
  name?: string;
  hardwareId?: string | null;
  scanRegion?: ScanRegion | null;
  captureSettleDelayMs?: number | null;
  matchesNeeded?: number | null;
  feederStopPulse?: number | null;
  checkBothOrientations?: boolean | null;
  flipCamera?: boolean;
  moduleCount?: number;
  channelLayout?: ChannelLayout;
  setupCompleted?: boolean;
  pipelinedFeed?: boolean;
  autoConnect?: boolean;
  testOnConnect?: boolean;
}

export interface Device {
  guid: string;
  name: string;
  hardwareId: string | null;
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  matchesNeeded: number;
  feederStopPulse: number | null;
  checkBothOrientations: boolean;
  flipCamera: boolean;
  moduleCount: number;
  channelLayout: ChannelLayout;
  setupCompletedAt: string | null;
  pipelinedFeed: boolean;
  autoConnect: boolean;
  testOnConnect: boolean;
  createdAt: string;
  updatedAt: string;
}
