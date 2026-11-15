import {
  CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX,
  CSV_IMPORT_TEMPLATE_STORAGE_PREFIX,
} from "@/lib/constants/csv-import";
import type {
  CsvImportDialogType,
  ImportTemplateRow,
} from "@/lib/interfaces/csv-import";
import {
  CSV_IMPORT_PRESET_FOR_SOURCE,
  detectSource,
  inferComposition,
  inferCsvMapping,
  inferCsvMappingForPreset,
  type CsvImportMapping,
  type CsvImportPresetKey,
} from "@magic-vault/shared";

export function lastUsedTemplateGuid(type: CsvImportDialogType): string | null {
  try {
    return localStorage.getItem(`${CSV_IMPORT_TEMPLATE_STORAGE_PREFIX}:${type}`);
  } catch {
    return null;
  }
}

export function rememberLastUsedTemplate(
  type: CsvImportDialogType,
  guid: string | null,
) {
  try {
    if (guid) {
      localStorage.setItem(`${CSV_IMPORT_TEMPLATE_STORAGE_PREFIX}:${type}`, guid);
    } else {
      localStorage.removeItem(`${CSV_IMPORT_TEMPLATE_STORAGE_PREFIX}:${type}`);
    }
  } catch {
    return;
  }
}

export function mappingForTemplate(
  template: ImportTemplateRow,
  headers: string[],
  type: CsvImportDialogType,
): CsvImportMapping {
  const columns = Object.fromEntries(
    Object.entries(template.mapping.columns).filter(
      ([, index]) => index < headers.length,
    ),
  );
  return {
    type,
    columns,
    composition: template.mapping.composition,
    singleOrderName: template.mapping.singleOrderName,
    sourceHeaders: template.mapping.sourceHeaders ?? null,
  };
}

export function templateMatchesHeaders(
  template: ImportTemplateRow,
  headers: string[],
): boolean {
  const savedHeaders = template.mapping.sourceHeaders;
  if (!savedHeaders || savedHeaders.length !== headers.length) return false;
  return savedHeaders.every(
    (header, index) =>
      header.trim().toLowerCase() === headers[index].trim().toLowerCase(),
  );
}

export function inferredMapping(
  type: CsvImportDialogType,
  headers: string[],
  rows: string[][],
): CsvImportMapping {
  const inferred = inferCsvMapping(type, headers);
  return { ...inferred, composition: inferComposition(rows, inferred) };
}

export function presetMapping(
  type: CsvImportDialogType,
  headers: string[],
  rows: string[][],
  preset: CsvImportPresetKey,
): CsvImportMapping {
  const mapping = inferCsvMappingForPreset(type, headers, preset);
  return { ...mapping, composition: inferComposition(rows, mapping) };
}

export function builtInPresetGuidForHeaders(
  type: CsvImportDialogType,
  headers: string[],
): string {
  if (type !== "orders") return "";
  const preset =
    CSV_IMPORT_PRESET_FOR_SOURCE[
      detectSource(headers.map((header) => header.toLowerCase()))
    ];
  return preset ? `${CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX}${preset}` : "";
}
