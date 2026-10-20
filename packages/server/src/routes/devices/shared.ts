import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  toLightMode,
} from "@magic-vault/shared";
import { toScanRegion } from "../org-settings/shared";

export function toDevice(row: {
  guid: string | null;
  name: string;
  hardwareId: string | null;
  scanCoverage: number | null;
  scanOffsetX: number | null;
  scanOffsetY: number | null;
  captureSettleDelayMs: number | null;
  matchesNeeded: number | null;
  feederStopPulse: number | null;
  checkBothOrientations: boolean | null;
  moduleCount: number;
  channelLayout: string | null;
  setupCompletedAt: Date | null;
  pipelinedFeed: boolean;
  autoConnect: boolean;
  testOnConnect: boolean;
  lightMode: string;
  lightColor: string;
  lightBrightness: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    guid: row.guid!,
    name: row.name,
    hardwareId: row.hardwareId,
    scanRegion: toScanRegion(row),
    captureSettleDelayMs:
      row.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
    matchesNeeded: row.matchesNeeded ?? DEFAULT_MATCHES_NEEDED,
    feederStopPulse: row.feederStopPulse,
    checkBothOrientations:
      row.checkBothOrientations ?? DEFAULT_CHECK_BOTH_ORIENTATIONS,
    moduleCount: row.moduleCount,
    channelLayout: row.channelLayout,
    setupCompletedAt: row.setupCompletedAt?.toISOString() ?? null,
    pipelinedFeed: row.pipelinedFeed,
    autoConnect: row.autoConnect,
    testOnConnect: row.testOnConnect,
    lightMode: toLightMode(row.lightMode),
    lightColor: row.lightColor,
    lightBrightness: row.lightBrightness,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
