import type { SERIAL_RESET_REASONS } from "../constants/firmware.constant";

export type FirmwareFeature =
  | "pipelinedFeed"
  | "feederRollback"
  | "storedCalibration"
  | "paddleOpenDelay"
  | "wifiRemote"
  | "retractCard"
  | "moduleDetection"
  | "pusherNudge"
  | "emergencyStop"
  | "ledStrips";

export type RetractCardOutcome = "retracted" | "rollback_off" | "failed";

export type SerialResetReason = (typeof SERIAL_RESET_REASONS)[number];

export interface FirmwareRelease {
  version: string;
  publishedAt: string;
}

export interface FirmwareLedState {
  on: boolean;
  hue: number;
  brightness: number;
}

export interface FirmwareLedUpdate {
  strip: number;
  led?: number;
  on?: boolean;
  hue?: number;
  brightness?: number;
}
