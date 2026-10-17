import type {
  BinDirection,
  BinHeight,
  BinRoute,
  FeederCalibration,
  ModuleConfig,
  ScanRegion,
  ServoCalibration,
} from "@magic-vault/shared";
import type { IconName } from "@/lib/interfaces/ui";

export type ServoName = "bottom" | "paddle" | "pusher";

export type SliderKey = `${number}:${ServoName}`;

export type ActivePositions = Partial<Record<SliderKey, string | null>>;

export type ModuleDelayField = "paddleOpenDelay" | "pusherHoldDuration" | "paddleCloseDelay";

export interface DirectionalSpeed {
  direction: "forward" | "reverse";
  magnitude: number;
}

export interface ServoConfig {
  name: ServoName;
  positions: string[];
}

export interface SetupServoPosition {
  servo: ServoName;
  position: string;
  calKey: keyof ServoCalibration;
}

export interface CalibrationState {
  modules: number[];
  configs: ModuleConfig[];
  isLoading: boolean;
  canCalibrate: boolean;
  isReady: boolean;
  active: ActivePositions;
  sliderValues: Partial<Record<SliderKey, number>>;
  pendingCalibration: Record<number, Partial<ServoCalibration>>;
  moduleDelayValues: Record<number, Record<ModuleDelayField, number>>;
  testingServos: Partial<Record<SliderKey, boolean>>;
  pushTestingModule: number | null;
  isTesting: boolean;
  isUnconfigured: boolean;
  feederValues: FeederCalibration;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  handleControl: (module: number, servo: ServoName, position: string) => void;
  handleSliderChange: (module: number, servo: ServoName, value: number) => void;
  handleServoTest: (module: number, servo: ServoName) => void;
  handlePushTest: (module: number, direction: "left" | "right") => Promise<void>;
  handleModuleDelayChange: (module: number, field: ModuleDelayField, value: number) => void;
  handleFeederChange: (field: keyof FeederCalibration, value: number) => void;
  handleTest: () => Promise<void>;
  handleFeed: () => Promise<void>;
  handleDropCard: () => void;
  handleResetServosToDefaults: () => void;
  save: () => Promise<void>;
  discard: () => void;
}

export interface ServoControlProps {
  module: number;
  servo: ServoConfig;
  sliderValue: number;
  activePosition: string | null | undefined;
  calibration: ServoCalibration | undefined;
  canCalibrate: boolean;
  isTesting: boolean;
  showRaw: boolean;
  onControl: (module: number, servo: ServoName, position: string) => void;
  onSliderChange: (module: number, servo: ServoName, value: number) => void;
  onTest: (module: number, servo: ServoName) => void;
}

export interface ModuleCardProps {
  module: number;
  state: CalibrationState;
  firmwareVersion: string | null;
}

export interface FeederPanelProps {
  state: CalibrationState;
  firmwareVersion: string | null;
}

export interface DevicePatch {
  moduleCount?: number;
  autoConnect?: boolean;
  testOnConnect?: boolean;
  pipelinedFeed?: boolean;
  scanRegion?: ScanRegion;
  captureSettleDelayMs?: number;
  matchesNeeded?: number;
  checkBothOrientations?: boolean;
}

export type DeviceToggleKey = "autoConnect" | "testOnConnect" | "pipelinedFeed";

export interface CalibrationSectionLink {
  path: "/calibrate/servos" | "/calibrate/layout" | "/calibrate/scan-region" | "/calibrate/connection" | "/calibrate/test";
  titleKey: string;
  descriptionKey: string;
  icon: IconName;
}

export interface BinSlotProps {
  label: string;
  binNumber: number | undefined;
  binCount: number;
  height: number | undefined;
  onBinChange: (binNumber: number) => void;
  onHeightChange: (binNumber: number, height: number) => void;
}

export interface BinSizePickerProps {
  binNumber: number;
  height: number | undefined;
  onChange: (binNumber: number, height: number) => void;
}

export interface ScanRegionEditorProps {
  region: ScanRegion;
  onChange: (region: ScanRegion) => void;
}

export interface LayoutDraft {
  moduleCount: number;
  savedModuleCount: number;
  moduleOptions: number[];
  routes: BinRoute[];
  heights: BinHeight[];
  isDirty: boolean;
  isReducing: boolean;
  isSaving: boolean;
  saveError: boolean;
  setModuleCount: (count: number) => void;
  assignSlot: (module: number, direction: BinDirection, binNumber: number) => void;
  setBottomModule: (binNumber: number, module: number) => void;
  setHeight: (binNumber: number, height: number) => void;
  resetRoutes: () => void;
  save: () => Promise<void>;
  discard: () => void;
}

export interface ScanSettingsDraft {
  region: ScanRegion;
  captureSettleDelayMs: number;
  matchesNeeded: number;
  checkBothOrientations: boolean;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  setRegion: (region: ScanRegion) => void;
  resetRegion: () => void;
  setCaptureSettleDelayMs: (value: number) => void;
  setMatchesNeeded: (value: number) => void;
  setCheckBothOrientations: (value: boolean) => void;
  save: () => Promise<void>;
  discard: () => void;
}

export type DeviceToggles = Record<DeviceToggleKey, boolean>;

export interface DeviceTogglesDraft {
  values: DeviceToggles;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  set: (key: DeviceToggleKey, value: boolean) => void;
  save: () => Promise<void>;
  discard: () => void;
}

export interface TestControls {
  modules: number[];
  binCount: number;
  isReady: boolean;
  irStates: boolean[] | null;
  hopperHasCards: boolean | null;
  irMonitoring: boolean;
  activeBin: number | null;
  isSampleRunning: boolean;
  routeError: string | null;
  readIr: () => Promise<void>;
  toggleIrMonitor: () => void;
  testBin: (bin: number) => Promise<void>;
  sampleRun: () => Promise<void>;
  resetToNeutral: () => Promise<void>;
}

export interface IrReading {
  ir?: unknown;
  hopper?: unknown;
}
