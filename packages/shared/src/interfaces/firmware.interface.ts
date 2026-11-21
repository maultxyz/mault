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
  | "ledStrips"
  | "sensorCheckedCommands";

export type RetractCardOutcome = "retracted" | "rollback_off" | "failed";

export type SerialResetReason = (typeof SERIAL_RESET_REASONS)[number];

export interface FirmwareRelease {
  version: string;
  publishedAt: string;
}

export type FirmwareLedChannel = "red" | "green" | "blue" | "white";

export interface FirmwareLedState extends Record<FirmwareLedChannel, number> {
  on: boolean;
  brightness: number;
}

export interface FirmwareLedUpdate extends Partial<FirmwareLedState> {
  strip: number;
  led?: number;
}
