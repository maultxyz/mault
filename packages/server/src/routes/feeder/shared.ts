import type { FeederCalibration } from "@magic-vault/shared";
import type { feederConfigs } from "../../db/schema";

export function rowToCalibration(
  row: typeof feederConfigs.$inferSelect,
): FeederCalibration {
  return {
    speed: row.speed,
    duration: row.duration,
    pulseDuration: row.pulseDuration,
    pauseDuration: row.pauseDuration,
    settleDuration: row.settleDuration,
  };
}
