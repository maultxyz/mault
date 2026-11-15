import { useOrg } from "@/features/companies/api/use-organization";
import {
  createImportTemplate,
  importTemplatesQueryOptions,
} from "@/lib/api/import-templates";
import { CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX } from "@/lib/constants/csv-import";
import {
  builtInPresetGuidForHeaders,
  inferredMapping,
  lastUsedTemplateGuid,
  mappingForTemplate,
  presetMapping,
  rememberLastUsedTemplate,
  templateMatchesHeaders,
} from "@/lib/csv-import-templates";
import type {
  UseCsvImportOptions,
  UseCsvImportResult,
} from "@/lib/interfaces/csv-import";
import { toast } from "@/lib/toast";
import {
  missingRequiredCsvFields,
  parseCsvTable,
  type CsvImportField,
  type CsvImportMapping,
  type CsvImportPresetKey,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function useCsvImport({
  type,
  text,
  enabled,
}: UseCsvImportOptions): UseCsvImportResult {
  const { t } = useTranslation("csvImport");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [mapping, setMapping] = useState<CsvImportMapping | null>(null);
  const [templateGuid, setTemplateGuid] = useState("");
  const [pendingTemplateGuid, setPendingTemplateGuid] = useState<string | null>(
    null,
  );
  const [templateName, setTemplateName] = useState("");

  const table = useMemo(() => parseCsvTable(text), [text]);
  const isTabular = table.headers.length >= 2 && table.rows.length > 0;

  const templatesQuery = useQuery({
    ...importTemplatesQueryOptions(type, activeOrg?.id ?? ""),
    enabled,
  });
  const templates = useMemo(
    () => templatesQuery.data ?? [],
    [templatesQuery.data],
  );

  useEffect(() => {
    if (!isTabular) {
      setMapping(null);
      return;
    }
    setMapping(inferredMapping(type, table.headers, table.rows));
    setTemplateName("");
    const detected = templates.find((row) =>
      templateMatchesHeaders(row, table.headers),
    );
    if (detected) {
      setTemplateGuid(detected.guid);
      setPendingTemplateGuid(null);
      rememberLastUsedTemplate(type, detected.guid);
      setMapping(mappingForTemplate(detected, table.headers, type));
      return;
    }
    const savedGuid = lastUsedTemplateGuid(type);
    const saved = savedGuid
      ? templates.find((row) => row.guid === savedGuid)
      : undefined;
    if (saved) {
      setTemplateGuid(saved.guid);
      setPendingTemplateGuid(null);
      setMapping(mappingForTemplate(saved, table.headers, type));
    } else if (savedGuid) {
      setTemplateGuid("");
      setPendingTemplateGuid(savedGuid);
    } else {
      setTemplateGuid(builtInPresetGuidForHeaders(type, table.headers));
      setPendingTemplateGuid(null);
    }
  }, [type, isTabular, templates, table]);

  useEffect(() => {
    if (!pendingTemplateGuid || !isTabular) return;
    const saved = templates.find((row) => row.guid === pendingTemplateGuid);
    if (!saved) return;
    setTemplateGuid(saved.guid);
    setPendingTemplateGuid(null);
    setMapping(mappingForTemplate(saved, table.headers, type));
  }, [pendingTemplateGuid, templates, isTabular, table.headers, type]);

  const assignFieldToColumn = (
    field: CsvImportField,
    columnIndex: number | null,
  ) =>
    setMapping((current) => {
      if (!current) return current;
      const columns = { ...current.columns };
      if (columnIndex === null) delete columns[field];
      else columns[field] = columnIndex;
      return { ...current, columns };
    });

  const assignColumnToField = (
    columnIndex: number,
    field: CsvImportField | null,
  ) =>
    setMapping((current) => {
      if (!current) return current;
      const columns = { ...current.columns };
      for (const [key, index] of Object.entries(columns)) {
        if (index === columnIndex) delete columns[key as CsvImportField];
      }
      if (field !== null) columns[field] = columnIndex;
      return { ...current, columns };
    });

  const applyTemplate = (guid: string) => {
    setTemplateGuid(guid);
    setPendingTemplateGuid(null);
    const isBuiltIn = guid.startsWith(CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX);
    rememberLastUsedTemplate(type, isBuiltIn ? null : guid || null);
    if (!isTabular) return;
    if (guid === "") {
      setMapping(inferredMapping(type, table.headers, table.rows));
      return;
    }
    if (isBuiltIn) {
      const preset = guid.slice(
        CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX.length,
      ) as CsvImportPresetKey;
      setMapping(presetMapping(type, table.headers, table.rows, preset));
      return;
    }
    const saved = templates.find((row) => row.guid === guid);
    if (saved) setMapping(mappingForTemplate(saved, table.headers, type));
  };

  const saveTemplate = useMutation({
    mutationFn: () =>
      createImportTemplate({
        name: templateName.trim(),
        type,
        mapping: {
          ...(mapping ?? {
            type,
            columns: {},
            composition: "single",
            singleOrderName: null,
          }),
          sourceHeaders: table.headers,
        },
      }),
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message || t("templates.saveFailed"));
        return;
      }
      toast.success(t("templates.saved"));
      setTemplateName("");
      setTemplateGuid(result.data.guid);
      setPendingTemplateGuid(null);
      rememberLastUsedTemplate(type, result.data.guid);
      void queryClient.invalidateQueries({
        queryKey: importTemplatesQueryOptions(type, activeOrg?.id ?? "")
          .queryKey,
      });
    },
    onError: () => toast.error(t("templates.saveFailed")),
  });

  const reset = useCallback(() => {
    setMapping(null);
    setTemplateGuid("");
    setPendingTemplateGuid(null);
    setTemplateName("");
  }, []);

  return {
    table,
    isTabular,
    mapping,
    setMapping,
    assignFieldToColumn,
    assignColumnToField,
    missingFields: mapping ? missingRequiredCsvFields(type, mapping) : [],
    templates,
    templateGuid,
    applyTemplate,
    templateName,
    setTemplateName,
    saveTemplate: () => saveTemplate.mutate(),
    isSavingTemplate: saveTemplate.isPending,
    reset,
  };
}
