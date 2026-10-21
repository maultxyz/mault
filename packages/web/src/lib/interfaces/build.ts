import type { Icon } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import type { SorterPrintPart } from "@/lib/interfaces/sorter-model";

export type BoardType = "uno_r4" | "esp32";

export interface BoardInfo {
  displayName: string;
  shortName: string;
  irPins: number[];
  hopperIrPin: number;
  logicVoltage: "5V" | "3.3V";
  usbCableName: string;
  i2cSda: string;
  i2cScl: string;
  wiringDiagramSrc: string;
}

export type BuildTFunction = TFunction<"build">;

export interface BomRow {
  key: string;
  qty: (moduleCount: number) => string;
  name: string | ((boardType: BoardType) => string);
  part: (t: BuildTFunction, boardType: BoardType) => ReactNode;
  notes: (
    t: BuildTFunction,
    moduleCount: number,
    boardType: BoardType,
  ) => ReactNode;
  buyUrl?: string | ((boardType: BoardType) => string | undefined);
  alert?: (t: BuildTFunction) => ReactNode;
  optional?: true;
  visible?: (boardType: BoardType, mountType: Esp32MountType) => boolean;
}

export interface BomGroup {
  key: string;
  rows: BomRow[];
}

export interface BuildStep {
  key: string;
  text: ReactNode;
  note?: ReactNode;
  images?: string[];
  modelParts?: readonly SorterPrintPart[];
  reference?: ReactNode;
  optional?: true;
}

export interface BuildPhase {
  key: string;
  title: string;
  icon: Icon;
  steps: BuildStep[];
  intro?: ReactNode;
  video?: BuildVideo;
}

export interface BuildVideoChapter {
  key: BuildVideoChapterKey;
  startSeconds: number;
}

export type BuildVideoChapterKey =
  | "sortingModule"
  | "feederModule"
  | "completeAssembly"
  | "calibration";

export interface BuildVideo {
  url: string;
  chapters: BuildVideoChapter[];
}

export interface PhaseVideoProps {
  video: BuildVideo;
}

export type Esp32MountType = "breakout" | "bare";

export interface BuildSetupState {
  boardType: BoardType;
  mountType: Esp32MountType;
  moduleCount: number;
  usingKit: boolean;
}

export interface BuildSetupValue extends BuildSetupState {
  updateSetup: (patch: Partial<BuildSetupState>) => void;
}

export type WireColor = "yellow" | "green" | "blue" | "red" | "black" | "white";

export type WireKey =
  | "sda"
  | "scl"
  | "vcc"
  | "gnd"
  | "psuPositive"
  | "psuNegative"
  | "irSignal";

export type WiringViewMode = "table" | "diagram";

export interface WireSwatchProps {
  wire: WireKey;
}

export interface WiringPinProps {
  children?: ReactNode;
}

export interface WiringTableProps {
  columns: string[];
  rows: ReactNode[][];
}

export interface WiringReferenceProps {
  anchorKey: string;
  title: string;
  description?: ReactNode;
  footnote?: ReactNode;
  children: ReactNode;
}

export type PrintPartImagesStatus = "loading" | "ready" | "error";

export interface PrintPartImagesState {
  status: PrintPartImagesStatus;
  images: Partial<Record<SorterPrintPart, string>>;
}

export interface PrintPartImagesProps {
  parts: readonly SorterPrintPart[];
}

export interface PrintPartEntry {
  part: SorterPrintPart;
  plate: number;
  count: number | null;
}

export interface PrintPartsViewerProps {
  moduleCount: number;
  breakoutHeight: number | null;
  entries: PrintPartEntry[];
}

export interface PrintPartsKeyProps {
  entries: PrintPartEntry[];
  breakoutHeight: number | null;
  selected: SorterPrintPart | null;
  onSelect: (part: SorterPrintPart | null) => void;
  onPreview: (part: SorterPrintPart | null) => void;
}
