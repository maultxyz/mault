import type {
  CsvImportField,
  CsvImportMapping,
  CsvImportTable,
  PickListEntryInput,
} from "@magic-vault/shared";

export type CsvImportDialogType = "orders" | "picks";

export interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  importLabel: string;
  onImport: (entries: PickListEntryInput[]) => Promise<boolean>;
}

export interface ImportTemplateRow {
  guid: string;
  name: string;
  type: string;
  mapping: CsvImportMapping;
  createdAt: string;
  updatedAt: string;
}

export interface UseCsvImportOptions {
  type: CsvImportDialogType;
  text: string;
  enabled: boolean;
}

export interface UseCsvImportResult {
  table: CsvImportTable;
  isTabular: boolean;
  mapping: CsvImportMapping | null;
  setMapping: (mapping: CsvImportMapping) => void;
  assignFieldToColumn: (field: CsvImportField, columnIndex: number | null) => void;
  assignColumnToField: (columnIndex: number, field: CsvImportField | null) => void;
  missingFields: CsvImportField[];
  templates: ImportTemplateRow[];
  templateGuid: string;
  applyTemplate: (guid: string) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  saveTemplate: () => void;
  isSavingTemplate: boolean;
  reset: () => void;
}
