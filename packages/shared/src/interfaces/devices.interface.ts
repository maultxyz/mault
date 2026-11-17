import type { LightingDraft } from "./lighting.interface";
import type { ChannelLayout } from "./module-configs.interface";
import type { ScanRegion } from "./scanner.interface";

export interface DevicePatch extends Partial<LightingDraft> {
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
