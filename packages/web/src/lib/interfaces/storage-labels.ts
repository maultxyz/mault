import type { StorageLocation } from "@magic-vault/shared";
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

export interface StorageLabelOptionsFormProps {
  form: UseFormReturn<StorageLabelOptionsFormValues>;
  locations: StorageLocation[];
}

export interface StorageLabelsViewProps {
  orgId: string;
}
