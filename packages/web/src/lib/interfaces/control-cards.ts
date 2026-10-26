import type { TFunction } from "i18next";
import type { Control } from "react-hook-form";
import type { CONTROL_CARD_TOGGLE_VALUES } from "@/lib/constants/control-cards";
import type { ControlCardFormValues } from "@/schemas/control-cards.schema";

export type ScannerTFunction = TFunction<"scanner">;

export type ControlCardToggleValue = (typeof CONTROL_CARD_TOGGLE_VALUES)[number];

export interface ControlCardSheetEntry {
  id: string;
  title: string;
  actionLines: string[];
  qrCodeDataUrl: string;
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
