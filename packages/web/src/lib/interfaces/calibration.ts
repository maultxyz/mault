import type {
  BinHeight,
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
  isDirty: boolean;
  isSaving: boolean;
  save: (route: BinRoute) => void;
  swap: (route: BinRoute, displaced: BinRoute) => void;
  resetToDefaults: () => void;
  commit: () => Promise<void>;
  discard: () => void;
}

export interface BinHeightsContextValue {
  heights: BinHeight[];
  isDirty: boolean;
  isSaving: boolean;
  setHeight: (binNumber: number, height: number) => void;
  commit: () => Promise<void>;
  discard: () => void;
}

export interface ModuleCountConfigContextValue {
  current: number;
  displayCount: number;
  options: number[];
  isDirty: boolean;
  isSaving: boolean;
  isReducing: boolean;
  stage: (count: number) => void;
  commit: () => Promise<void>;
  discard: () => void;
}

export interface ServoConfig {
  name: "bottom" | "paddle" | "pusher";
  labelKey: string;
  positions: string[];
}

export type SliderKey = `${number}:${"bottom" | "paddle" | "pusher"}`;

export type ActivePositions = Record<string, string | null>;

export type BinSizePreset = "small" | "medium" | "large";

export interface BinHeightPreset {
  key: BinSizePreset;
  height: number;
}
