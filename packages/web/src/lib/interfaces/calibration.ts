import type { ReactNode } from "react";
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
  savedHeights: BinHeight[];
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

export interface SetupIrSeen {
  modules: Set<number>;
  hopper: boolean;
}

export interface ReadIrResponse {
  ir?: unknown;
  hopper?: unknown;
}

export interface SetupIrSensorRowProps {
  label: string;
  hint: string;
  present: boolean;
  seen: boolean;
}

export interface SetupIrSensor extends SetupIrSensorRowProps {
  key: string;
}

export interface SetupStepHeadingProps {
  title: string;
  body?: string;
}

export interface SetupControlPanelProps {
  label?: string;
  value?: string;
  hint?: string;
  children: ReactNode;
}

export interface SetupServoStepProps {
  servo: SetupServo;
  currentKey: SetupServoPosition["calKey"];
  value: number;
  onChange: (value: number) => void;
}

export type SetupTestState = "idle" | "running" | "passed" | "failed";

export interface SetupWizardContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  forceSetup: () => Promise<void>;
}

export type DeviceToggleKey = "autoConnect" | "testOnConnect" | "pipelinedFeed";

export type DeviceToggles = Record<DeviceToggleKey, boolean>;

export interface DeviceTogglesDraft {
  values: DeviceToggles;
  isLoaded: boolean;
  isDirty: boolean;
  isSaving: boolean;
  set: (key: DeviceToggleKey, value: boolean) => void;
  commit: () => Promise<void>;
  discard: () => void;
}

export interface DeviceTogglePanelProps {
  values: DeviceToggles;
  isLoaded: boolean;
  onChange: (key: DeviceToggleKey, value: boolean) => void;
}

export interface FeederCalibrationPanelProps {
  speedValue: number;
  durationValue: number;
  pulseDurationValue: number;
  pauseDurationValue: number;
  settleDurationValue: number;
  reverseSpeedValue: number;
  reverseDurationValue: number;
  isConnected: boolean;
  canCalibrate: boolean;
  onSpeedChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onPulseDurationChange: (value: number) => void;
  onPauseDurationChange: (value: number) => void;
  onSettleDurationChange: (value: number) => void;
  onReverseSpeedChange: (value: number) => void;
  onReverseDurationChange: (value: number) => void;
  onSelectContinuous: () => void;
}
