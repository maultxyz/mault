import { DEFAULT_CALIBRATION, type ModuleConfig } from "@magic-vault/shared";

export type CalibRow = {
  moduleNumber: number;
  bottomClosed: number;
  bottomOpen: number;
  paddleClosed: number;
  paddleOpen: number;
  pusherLeft: number;
  pusherNeutral: number;
  pusherRight: number;
  pusherHoldDuration: number;
  paddleCloseDelay: number;
};

export function toModuleConfig(row: CalibRow): ModuleConfig {
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
    },
  };
}

export function buildConfigs(rows: CalibRow[], moduleCount: number): ModuleConfig[] {
  return Array.from({ length: moduleCount }, (_, i) => i + 1).map((n) => {
    const row = rows.find((r) => r.moduleNumber === n);
    return row ? toModuleConfig(row) : { moduleNumber: n, calibration: { ...DEFAULT_CALIBRATION } };
  });
}
