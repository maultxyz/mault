import type { ReactNode } from "react";
import type {
  BinHeight,
  BinRoute,
  FeederCalibration,
  ModuleConfig,
  ServoCalibration,
  ChannelLayout,
  ScanRegion,
} from "@magic-vault/shared";
import type { useCalibrationPage } from "@/features/calibration/api/use-calibration-page";

export type CalibrationSection = "modules" | "scanRegion" | "calibration";

export interface ModuleConfigsContextValue {
  configs: ModuleConfig[];
  saveConfig: (
    moduleNumber: number,
    calibration: ServoCalibration,
  ) => Promise<void>;
  moveServo: (
    module: number,
    servo: ServoName,
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
  name: ServoName;
  labelKey: string;
  positions: string[];
}

export type SliderKey = `${number}:${ServoName}`;

export type ActivePositions = Record<string, string | null>;

export type ModuleDelayField = "pusherHoldDuration" | "paddleCloseDelay";

export type ServoName = "bottom" | "paddle" | "pusher";

export interface SetupServoPosition {
  servo: ServoName;
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

export type SetupIntroPart = "feeder" | "module" | ServoName;

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
  servo: ServoName;
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

export interface StoredCalibration {
  channelOffset: number;
  dirty: boolean;
  modules: ModuleConfig[];
  feeder: FeederCalibration;
}

export type StoredCalibrationRead =
  | { status: "unsupported" }
  | { status: "empty" }
  | { status: "stored"; calibration: StoredCalibration };

export type CalibrationSource = "app" | "device";

export interface CalibrationDifference {
  moduleNumber: number | null;
  field: keyof ServoCalibration | keyof FeederCalibration;
  appValue: number;
  deviceValue: number;
}

export interface CalibrationConflict {
  deviceName: string;
  differences: CalibrationDifference[];
}

export interface DeviceCalibration {
  modules: ModuleConfig[];
  feeder: FeederCalibration;
}

export interface DeviceCalibrationSyncContextValue {
  applyToDevice: (changes: Partial<DeviceCalibration>) => Promise<void>;
}

export interface CalibrationConflictDialogProps {
  conflict: CalibrationConflict | null;
  onChoose: (source: CalibrationSource) => void;
}

export interface Device {
  guid: string;
  name: string;
  hardwareId: string | null;
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  matchesNeeded: number;
  checkBothOrientations: boolean;
  moduleCount: number;
  channelLayout: ChannelLayout;
  setupCompletedAt: string | null;
  pipelinedFeed: boolean;
  autoConnect: boolean;
  testOnConnect: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationDebugParams {
  channelLayout: ChannelLayout;
  moduleCount: number;
  configs: ModuleConfig[];
  feederConfig: FeederCalibration;
  binRoutes: BinRoute[];
  firmwareVersion: string | null;
  board: string | null;
}

export type CalibrationPageState = ReturnType<typeof useCalibrationPage>;

export interface StaleDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunTest: () => void;
  onCalibrateFirst: () => void;
}

export interface DirectionalSpeed {
  direction: "forward" | "reverse";
  magnitude: number;
}

export interface CalibrationTourProps {
  section: CalibrationSection;
  setSection: (section: CalibrationSection) => void;
  className?: string;
}

export interface FrameSize {
  width: number;
  height: number;
}

export interface FeederConfigContextValue {
  feederConfig: FeederCalibration;
  saveConfig: (calibration: FeederCalibration) => Promise<void>;
  previewSpeed: (value: number) => void;
}

export type RegionDragState =
  | {
      type: "move";
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | {
      type: "resize";
      centerClientX: number;
      centerClientY: number;
      startDist: number;
      startCoverage: number;
    };

export interface RegionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BinRoutingControlsProps {
  activeBin: number | null;
  isReady: boolean;
  isSampleRunning: boolean;
  onTestBin: (bin: number) => void;
  onSampleRun: () => void;
}

export interface IrSensorPanelProps {
  modules: number[];
  irStates: boolean[] | null;
  hopperHasCards: boolean | null;
  isReady: boolean;
  isMonitoring: boolean;
  onRead: () => void;
  onToggleMonitor: () => void;
}

export interface ServoControlProps {
  module: number;
  servo: ServoConfig;
  sliderValue: number;
  activePosition: string | null | undefined;
  calibration: ServoCalibration | undefined;
  isLoading: boolean;
  canCalibrate: boolean;
  isTesting: boolean;
  showRaw: boolean;
  onControl: (
    module: number,
    servo: ServoName,
    position: string,
  ) => void;
  onSliderChange: (
    module: number,
    servo: ServoName,
    value: number,
  ) => void;
  onTest: (module: number, servo: ServoName) => void;
}

export interface ModuleDelayControlProps {
  module: number;
  field: ModuleDelayField;
  value: number;
  isConnected: boolean;
  onChange: (module: number, field: ModuleDelayField, value: number) => void;
}

export interface PushTestControlProps {
  module: number;
  isReady: boolean;
  isTesting: boolean;
  onTest: (module: number, direction: "left" | "right") => void;
}

export interface ModuleCalibrationGridProps {
  modules: number[];
  configs: ModuleConfig[];
  active: ActivePositions;
  sliderValues: Record<SliderKey, number>;
  moduleDelayValues: Record<number, Record<ModuleDelayField, number>>;
  pendingCalibration: Record<number, Partial<ServoCalibration>>;
  isLoading: boolean;
  isConnected: boolean;
  isReady: boolean;
  canCalibrate: boolean;
  onControl: (
    module: number,
    servo: ServoName,
    position: string,
  ) => void;
  onSliderChange: (
    module: number,
    servo: ServoName,
    value: number,
  ) => void;
  onModuleDelayChange: (
    module: number,
    field: ModuleDelayField,
    value: number,
  ) => void;
  testingServos: Record<SliderKey, boolean>;
  onTest: (module: number, servo: ServoName) => void;
  pushTestingModule: number | null;
  onPushTest: (module: number, direction: "left" | "right") => void;
}

export interface ScanRegionCalibrationPanelProps {
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  matchesNeeded: number;
  checkBothOrientations: boolean;
  isLoading: boolean;
  onRegionChange: (region: ScanRegion) => void;
  onResetRegion: () => void;
  onCaptureSettleChange: (value: number) => void;
  onMatchesNeededChange: (value: number) => void;
  onCheckBothOrientationsChange: (value: boolean) => void;
}

export type PendingConnectKind = "usb" | "bluetooth";
