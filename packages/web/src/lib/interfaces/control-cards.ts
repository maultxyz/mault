import type { ScannerControlCommand } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import type { QRCodeErrorCorrectionLevel } from "qrcode";
import type { Control } from "react-hook-form";
import type {
  CONTROL_CARD_STYLES,
  CONTROL_CARD_TOGGLE_VALUES,
} from "@/lib/constants/control-cards";
import type { ControlCardFormValues } from "@/schemas/control-cards.schema";

export type ScannerTFunction = TFunction<"scanner">;

export type ControlCardToggleValue = (typeof CONTROL_CARD_TOGGLE_VALUES)[number];

export type ControlCardStyle = (typeof CONTROL_CARD_STYLES)[number];

export type ControlCardFrameColor = "blue" | "red" | "green" | "white" | "black";

export type ControlCardTypeLine =
  | "sorcery"
  | "instant"
  | "enchantment"
  | "artifact"
  | "creature";

export interface ControlCardFrame {
  color: ControlCardFrameColor;
  typeLine: ControlCardTypeLine;
}

export interface ControlCardArtwork {
  imagePath: string;
  command: ScannerControlCommand;
}

export interface ControlCardFrameText {
  name: string;
  typeLine: string;
  rulesParagraphs: string[];
}

export type ControlCardIllustratedFace =
  | { kind: "artwork"; imagePath: string }
  | { kind: "frame"; imagePath: string; text: ControlCardFrameText };

export type ControlCardFace =
  | ControlCardIllustratedFace
  | { kind: "plain"; title: string; actionLines: string[] };

export interface ControlCardTextLineLayout {
  left: number;
  centerY: number;
  maxWidth: number;
  fontSize: number;
  isBold: boolean;
  align: CanvasTextAlign;
}

export interface ControlCardTextBlockLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  maxFontSize: number;
  minFontSize: number;
  fontSizeStep: number;
  lineHeight: number;
  paragraphGap: number;
  align: CanvasTextAlign;
}

export interface ControlCardRenderLayout {
  trimWidth: number;
  trimHeight: number;
  bleed: number;
  artworkBleedColor: string;
  paperColor: string;
  inkColor: string;
  cornerMark: { length: number; width: number; color: string };
  qrErrorCorrectionLevel: QRCodeErrorCorrectionLevel;
  qrMarginModules: number;
  frame: {
    fontFamily: string;
    qrPlate: {
      centerX: number;
      centerY: number;
      size: number;
      padding: number;
      radius: number;
      borderColor: string;
      borderWidth: number;
    };
    name: ControlCardTextLineLayout;
    typeLine: ControlCardTextLineLayout;
    rules: ControlCardTextBlockLayout;
  };
  plain: {
    fontFamily: string;
    title: ControlCardTextLineLayout;
    qrLeft: number;
    qrTop: number;
    qrSize: number;
    actions: ControlCardTextBlockLayout;
  };
  outputMimeType: string;
  outputQuality: number;
}

export interface ControlCardSheetLayout {
  pageWidth: number;
  pageHeight: number;
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  bleed: number;
  cutLineWidth: number;
  cutLineColor: string;
  logo: {
    originX: number;
    originY: number;
    markSize: number;
    wordmark: string;
    wordmarkFontSize: number;
    wordmarkGap: number;
  };
}

export interface ControlCardSheetGeometry {
  gridLeft: number;
  gridTop: number;
  gridWidth: number;
  gridHeight: number;
  trimXs: number[];
  trimYs: number[];
}

export interface ControlCardSheetEntry {
  id: string;
  style: ControlCardStyle;
  cardImageDataUrl: string;
}

export interface ControlCardBuilderProps {
  onAdd: (entry: ControlCardSheetEntry) => void;
}

export interface ControlCardSheetProps {
  entries: ControlCardSheetEntry[];
  onRemove: (entryId: string) => void;
}

export interface ControlCardTileProps {
  entry: ControlCardSheetEntry;
  onRemove: (entryId: string) => void;
}

export interface ControlCardOption {
  value: string;
  label: string;
}

export type ControlCardSelectFieldName =
  | "collectionGuid"
  | "presetGuid"
  | "forcedFoilType"
  | "condition"
  | "autoFeed"
  | "allowDuplicates";

export interface ControlCardSelectFieldProps {
  control: Control<ControlCardFormValues>;
  name: ControlCardSelectFieldName;
  label: string;
  options: ControlCardOption[];
  onValueChange?: (value: string) => void;
}

export interface ControlCardSetFieldProps {
  control: Control<ControlCardFormValues>;
  label: string;
  options: ControlCardOption[];
}
