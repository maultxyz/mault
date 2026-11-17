import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  toLightMode,
  toPriceSource,
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
  flipCamera: boolean;
  moduleCount: number;
  channelLayout: string | null;
  setupCompletedAt: Date | null;
  pipelinedFeed: boolean;
  autoConnect: boolean;
  testOnConnect: boolean;
  lightMode: string;
  lightColor: string;
  lightBrightness: number;
  lightWhite: number;
  lightLedCount: number;
  valueCelebrationEnabled: boolean;
  valueCelebrationThreshold: number;
  valueCelebrationPriceSource: string;
  valueCelebrationDurationMs: number;
  lightWarningsEnabled: boolean;
  lightEmptyWarningSeconds: number;
  lightBlockedWarningSeconds: number;
  lightNormalSeconds: number;
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
    flipCamera: row.flipCamera,
    moduleCount: row.moduleCount,
    channelLayout: row.channelLayout,
    setupCompletedAt: row.setupCompletedAt?.toISOString() ?? null,
    pipelinedFeed: row.pipelinedFeed,
    autoConnect: row.autoConnect,
    testOnConnect: row.testOnConnect,
    lightMode: toLightMode(row.lightMode),
    lightColor: row.lightColor,
    lightBrightness: row.lightBrightness,
    lightWhite: row.lightWhite,
    lightLedCount: row.lightLedCount,
    valueCelebrationEnabled: row.valueCelebrationEnabled,
    valueCelebrationThreshold: row.valueCelebrationThreshold,
    valueCelebrationPriceSource: toPriceSource(row.valueCelebrationPriceSource),
    valueCelebrationDurationMs: row.valueCelebrationDurationMs,
    lightWarningsEnabled: row.lightWarningsEnabled,
    lightEmptyWarningSeconds: row.lightEmptyWarningSeconds,
    lightBlockedWarningSeconds: row.lightBlockedWarningSeconds,
    lightNormalSeconds: row.lightNormalSeconds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
