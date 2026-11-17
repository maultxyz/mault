import type { SERIAL_RESET_REASONS } from "../constants/firmware.constant";

export type FirmwareFeature =
  | "pipelinedFeed"
  | "feederRollback"
  | "storedCalibration"
  | "paddleOpenDelay"
  | "wifiRemote"
  | "lighting"
  | "lightingWarnings"
  | "rgbwLighting"
  | "configurableLighting"
  | "retractCard"
  | "moduleDetection"
  | "pusherNudge";

export type RetractCardOutcome = "retracted" | "rollback_off" | "failed";

export type SerialResetReason = (typeof SERIAL_RESET_REASONS)[number];

export interface FirmwareRelease {
  version: string;
  publishedAt: string;
}
