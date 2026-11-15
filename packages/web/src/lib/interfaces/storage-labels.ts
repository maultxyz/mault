import type { StorageLocation } from "@magic-vault/shared";
import type { STORAGE_LABEL_TEMPLATE_IDS } from "@/lib/constants/storage-labels";
import type { StorageLabelOptionsFormValues } from "@/schemas/storage-labels.schema";
import type { UseFormReturn } from "react-hook-form";

export type StorageLabelTemplateId = (typeof STORAGE_LABEL_TEMPLATE_IDS)[number];

export interface StorageLabelTemplate {
  id: StorageLabelTemplateId;
  pageWidth: number;
  pageHeight: number;
  columns: number;
  rows: number;
  labelWidth: number;
  labelHeight: number;
  marginLeft: number;
  marginTop: number;
  horizontalPitch: number;
  verticalPitch: number;
  contentPadding: number;
}

export interface StorageLabelPlacement {
  x: number;
  y: number;
  itemIndex: number;
}

export interface StorageLabelPage {
  pageNumber: number;
  placements: StorageLabelPlacement[];
}

export interface StorageLabelSheetProps {
  template: StorageLabelTemplate;
  locations: StorageLocation[];
  orgId: string;
  startPosition: number;
}

export interface StorageLabelProps {
  template: StorageLabelTemplate;
  location: StorageLocation;
  orgId: string;
  placement: StorageLabelPlacement;
}

export interface StorageLabelOptionsFormProps {
  form: UseFormReturn<StorageLabelOptionsFormValues>;
  locations: StorageLocation[];
}

export interface StorageLabelsViewProps {
  orgId: string;
}
