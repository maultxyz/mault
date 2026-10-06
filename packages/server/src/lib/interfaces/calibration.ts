import type { ServoCalibration } from "@magic-vault/shared";

export type BinRouteRow = {
  binNumber: number;
  module: number;
  direction: string;
};

export type ModuleCalibrationRow = ServoCalibration & { moduleNumber: number };
