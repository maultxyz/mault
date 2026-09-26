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

export type ModuleDelayField = "pusherHoldDuration" | "paddleCloseDelay";

export type SetupServo = "bottom" | "paddle" | "pusher";

export interface SetupServoPosition {
  servo: SetupServo;
  position: "closed" | "open" | "neutral" | "left" | "right";
  calKey:
    | "bottomClosed"
    | "bottomOpen"
    | "paddleClosed"
    | "paddleOpen"
    | "pusherNeutral"
    | "pusherLeft"
    | "pusherRight";
  // Where the servo is parked once its last position is set.
  restKey: "bottomClosed" | "paddleClosed" | "pusherNeutral";
}

export type SetupWizardStep =
  | { kind: "intro" }
  | { kind: "moduleCount" }
  | { kind: "servo"; module: number; position: SetupServoPosition }
  | { kind: "irSensors" }
  | { kind: "feeder" }
  | { kind: "test" };

export type SetupIntroPart = "feeder" | "module" | "bottom" | "paddle" | "pusher";

export interface SetupIrReading {
  modules: boolean[];
  hopper: boolean;
}

export type SetupTestState = "idle" | "running" | "passed" | "failed";

export interface SetupWizardContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  forceSetup: () => Promise<void>;
}
