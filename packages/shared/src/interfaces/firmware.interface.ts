import type { SERIAL_RESET_REASONS } from "../constants/firmware.constant";

export type FirmwareFeature =
  | "pipelinedFeed"
  | "feederRollback"
  | "storedCalibration"
  | "paddleOpenDelay"
  | "wifiRemote"
  | "retractCard";

export type RetractCardOutcome = "retracted" | "rollback_off" | "failed";

export type SerialResetReason = (typeof SERIAL_RESET_REASONS)[number];
