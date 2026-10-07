import { DEFAULT_CALIBRATION, type ModuleConfig } from "@magic-vault/shared";
import type { ModuleCalibrationRow } from "../../lib/interfaces/calibration";

export function toModuleConfig(row: ModuleCalibrationRow): ModuleConfig {
  return {
    moduleNumber: row.moduleNumber,
    calibration: {
      bottomClosed: row.bottomClosed,
      bottomOpen: row.bottomOpen,
      paddleClosed: row.paddleClosed,
      paddleOpen: row.paddleOpen,
      pusherLeft: row.pusherLeft,
      pusherNeutral: row.pusherNeutral,
      pusherRight: row.pusherRight,
      pusherHoldDuration: row.pusherHoldDuration,
      paddleCloseDelay: row.paddleCloseDelay,
      paddleOpenDelay: row.paddleOpenDelay,
    },
  };
}

export function buildConfigs(rows: ModuleCalibrationRow[], moduleCount: number): ModuleConfig[] {
  return Array.from({ length: moduleCount }, (_, i) => i + 1).map((n) => {
    const row = rows.find((r) => r.moduleNumber === n);
    return row ? toModuleConfig(row) : { moduleNumber: n, calibration: { ...DEFAULT_CALIBRATION } };
  });
}
