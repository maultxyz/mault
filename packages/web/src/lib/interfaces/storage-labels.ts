import type { StorageLocation } from "@magic-vault/shared";
import type { STORAGE_LABEL_SHEET_KINDS } from "@/lib/constants/storage-labels";
import type { CardSheetGrid } from "@/lib/interfaces/card-sheets";
import type { LabelSheetTemplate } from "@/lib/interfaces/label-sheets";
import type { StorageLabelOptionsFormValues } from "@/schemas/storage-labels.schema";
import type { UseFormReturn } from "react-hook-form";

export interface StorageLabelSheetProps {
  template: LabelSheetTemplate;
  locations: StorageLocation[];
  orgId: string;
  startPosition: number;
}

export interface StorageLabelProps {
  template: LabelSheetTemplate;
  location: StorageLocation;
  orgId: string;
}

export type StorageLabelSheetKind = (typeof STORAGE_LABEL_SHEET_KINDS)[number];

export type BatchDivider =
  | {
      kind: "batch";
      key: string;
      locationName: string;
      batch: number;
      firstSlot: string;
      lastSlot: string;
    }
  | { kind: "custom"; key: string; text: string; locationName: string | null };

export interface BatchDividerPlan {
  dividers: BatchDivider[];
  totalDividers: number;
  skippedLocationNames: string[];
}

export interface BatchDividerSheetProps {
  dividers: BatchDivider[];
  showsLocationName: boolean;
}

export interface BatchDividerTextLine {
  text: string;
  fontSize: number;
  isTitle: boolean;
}

export interface BatchDividerSheetLayout extends CardSheetGrid {
  tabHeight: number;
  padding: number;
  titleMaxFontSize: number;
  detailFontSize: number;
  lineGap: number;
  cutLineWidth: number;
  cutLineColor: string;
  cardTopLineColor: string;
  cardTopLineDash: string;
}

export interface StorageLabelOptionsFormProps {
  form: UseFormReturn<StorageLabelOptionsFormValues>;
  locations: StorageLocation[];
}

export interface StorageLabelsViewProps {
  orgId: string;
}
