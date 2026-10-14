import type {
  ActivePositions,
  CalibrationPageState,
  ServoName,
  SliderKey,
} from "@/lib/interfaces/calibration";
import type { ModuleConfig, ServoCalibration } from "@magic-vault/shared";
import type { ReactNode } from "react";
import type { MeshStandardMaterial, Object3D } from "three";

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

export type SorterBaseNode =
  | "base"
  | "groundFeeder"
  | "groundFirst"
  | "groundMiddle"
  | "groundEnd"
  | "sleeves"
  | "baseBlock";

export type SorterModelRole =
  | "paddleHorn"
  | "rightPaddleLink"
  | "leftPaddleLink"
  | "rightPaddle"
  | "leftPaddle"
  | "bottomHorn"
  | "bottomLink"
  | "bottomPaddle"
  | "pusherHorn"
  | "leftPusherLink"
  | "rightPusherLink"
  | "leftPusher"
  | "rightPusher";

export interface SorterLinkage {
  driverPin: Vec2;
  rockerPin: Vec2;
  pivot: Vec2;
  coupler: SorterModelRole;
  rocker: SorterModelRole;
  startRockerDegrees: number;
}

export interface SorterMechanism {
  axis: Vec3;
  right: Vec3;
  up: Vec3;
  hub: Vec2;
  horn: SorterModelRole;
  startDegrees: number;
  linkages: SorterLinkage[];
}

export type SorterGateServo = Exclude<ServoName, "pusher">;

export interface SorterGatePose {
  closed: number;
  openDirection: 1 | -1;
  degreesPerTick: number;
}

export interface SorterPartPose {
  role: SorterModelRole;
  center: Vec2;
  angle: number;
  offset: Vec2;
}

export interface SorterServoTarget {
  angles: number[];
}

export type SorterServoTargets = Record<SliderKey, SorterServoTarget>;

export interface SorterFocus {
  module: number;
  servo: ServoName;
}

export type SorterModelPart =
  | ServoName
  | "servo"
  | "platform"
  | "feeder"
  | "frame";

export interface SorterModelLegendProps {
  focus: SorterFocus | null;
}

export type SorterScenePalette = "calibration" | "print";

export type SorterPrintPart =
  | "sortingModule"
  | "feederModule"
  | "shroud"
  | "baseSupportTall"
  | "baseSupportShort"
  | "baseSupportBreakout"
  | "circuitBoardPlate"
  | "servoControllerPlate"
  | "endPlate"
  | "genericPlate"
  | "binsPlate"
  | "endBinPlate"
  | "optionalPlate"
  | "otherPrinted"
  | "hardware";

export interface SorterBaseSupportBlock {
  part: SorterPrintPart;
  alt: boolean;
}

export interface SorterBaseSupportCounts {
  threeTall: number;
  oneTall: number;
}

export interface SorterSceneOptions {
  container: HTMLElement;
  palette?: SorterScenePalette;
  reducedMotion: boolean;
  onLoad: () => void;
  onError: (error: unknown) => void;
}

export type SorterModelStatus = "loading" | "ready" | "error";

export interface SorterServoState {
  modules: number[];
  configs: ModuleConfig[];
  pendingCalibration: Record<number, Partial<ServoCalibration>>;
  active: ActivePositions;
  sliderValues: Record<SliderKey, number>;
  testingServos: Record<SliderKey, boolean>;
  pushTestingModule: number | null;
}

export interface SorterModelViewerProps extends SorterServoState {
  selectedHotspot: string | null;
  onSelectHotspot: (hotspot: SorterHotspot) => void;
  children?: ReactNode;
}

export type SorterHotspot =
  | { kind: "servo"; key: string; module: number; servo: ServoName }
  | { kind: "feeder"; key: string };

export interface SorterHotspotAnchor {
  element: HTMLElement;
  point: Vec3;
  module: number | null;
}

export interface SorterHotspotButtonProps {
  hotspot: SorterHotspot;
  selected: boolean;
  onSelect: (hotspot: SorterHotspot) => void;
  register: (hotspot: SorterHotspot, element: HTMLElement | null) => void;
}

export interface SorterCalibrationPanelProps {
  hotspot: SorterHotspot;
  state: CalibrationPageState;
  onClose: () => void;
}

export interface SorterCalibrationSectionProps {
  state: CalibrationPageState;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  actions?: ReactNode;
}

export interface SorterModuleRig {
  group: Object3D;
  parts: Map<SorterModelRole, Object3D>;
  materials: Map<ServoName, MeshStandardMaterial>;
}
