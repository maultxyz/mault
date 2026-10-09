import type { Icon } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";

export interface AnchorLinkButtonProps {
  id: string;
  className?: string;
}

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
  optional?: true | "classic-hopper" | "new-hopper";
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
  optional?: true | "classic-hopper" | "new-hopper";
}

export interface BuildPhase {
  key: string;
  title: string;
  icon: Icon;
  steps: BuildStep[];
  videos?: string[];
}

export interface BoardTypeContextValue {
  boardType: BoardType;
  setBoardType: (value: BoardType) => void;
}

export type Esp32MountType = "breakout" | "bare";

export interface Esp32MountTypeContextValue {
  mountType: Esp32MountType;
  setMountType: (value: Esp32MountType) => void;
}

export interface KitModeContextValue {
  usingKit: boolean;
  setUsingKit: (value: boolean) => void;
}

export interface ModuleCountContextValue {
  moduleCount: number;
  setModuleCount: (value: number) => void;
}
