import type {
  ComposedCsvOrder,
  CsvImportMapping,
  OrderSource,
  PickListEntryInput,
} from "@magic-vault/shared";

export type CsvImportDialogType = "orders" | "picks";

export type CsvImportPayload =
  | { type: "orders"; orders: ComposedCsvOrder[]; source: OrderSource }
  | { type: "picks"; entries: PickListEntryInput[] };

export interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CsvImportDialogType;
  title: string;
  description: string;
  importLabel: string;
  onImport: (payload: CsvImportPayload) => Promise<boolean>;
}

export interface ImportTemplateRow {
  guid: string;
  name: string;
  type: string;
  mapping: CsvImportMapping;
  createdAt: string;
  updatedAt: string;
}
