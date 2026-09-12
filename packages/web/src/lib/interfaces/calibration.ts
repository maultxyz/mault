import type {
  BinRoute,
  ModuleConfig,
  ServoCalibration,
} from "@magic-vault/shared";

export type CalibrationSection = "modules" | "scanRegion" | "calibration";

export interface ModuleConfigsContextValue {
  configs: ModuleConfig[];
  saveConfig: (
    moduleNumber: number,
    calibration: ServoCalibration,
  ) => Promise<void>;
  moveServo: (
    module: number,
    servo: "bottom" | "paddle" | "pusher",
    value: number,
  ) => void;
}

export interface BinRoutesContextValue {
  routes: BinRoute[];
  isPending: boolean;
  save: (route: BinRoute) => void;
  swap: (route: BinRoute, displaced: BinRoute) => Promise<void>;
  resetToDefaults: () => void;
}

export interface ServoConfig {
  name: "bottom" | "paddle" | "pusher";
  labelKey: string;
  controlPositions: string[];
  calibrationPositions: { labelKey: string; key: keyof ServoCalibration }[];
}

export type SliderKey = `${number}:${"bottom" | "paddle" | "pusher"}`;

export type ActivePositions = Record<string, string | null>;
