import type { FeederCalibration } from "@magic-vault/shared";

export function rowToCalibration(row: {
  speed: number;
  duration: number;
  pulseDuration: number;
  pauseDuration: number;
  settleDuration: number;
}): FeederCalibration {
  return {
    speed: row.speed,
    duration: row.duration,
    pulseDuration: row.pulseDuration,
    pauseDuration: row.pauseDuration,
    settleDuration: row.settleDuration,
  };
}
