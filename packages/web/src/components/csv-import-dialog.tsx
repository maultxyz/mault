import { Callout } from "@/components/callout";
import { CardListFileButton } from "@/components/card-list-file-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  createImportTemplate,
  importTemplatesQueryOptions,
} from "@/lib/api/import-templates";
import { CSV_IMPORT_PREVIEW_ROWS } from "@/lib/constants/csv-import";
import type { CardListFile } from "@/lib/interfaces/card-list-import";
import type {
  CsvImportDialogProps,
  CsvImportDialogType,
  ImportTemplateRow,
} from "@/lib/interfaces/csv-import";
import { toast } from "@/lib/toast";
import {
  CSV_IMPORT_BUILT_IN_PRESETS,
  CSV_IMPORT_FIELDS,
  CSV_IMPORT_NAME_MAX_LENGTH,
  CSV_IMPORT_PRESET_FOR_SOURCE,
  composeCsvOrders,
  composeCsvPickEntries,
  detectSource,
  inferComposition,
  inferCsvMapping,
  inferCsvMappingForPreset,
  missingRequiredCsvFields,
  parseCsvTable,
  parseDecklist,
} from "@magic-vault/shared";
import type {
  ComposedCsvOrder,
  CsvFieldScope,
  CsvImportField,
  CsvImportMapping,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconChevronDown, IconLoader2, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const csvImportTextSchema = z.object({
  text: z.string().trim().min(1),
});

type CsvImportTextValues = z.infer<typeof csvImportTextSchema>;

const TEMPLATE_STORAGE_PREFIX = "csv-import-template";

function lastUsedTemplateGuid(type: CsvImportDialogType): string | null {
  try {
    return localStorage.getItem(`${TEMPLATE_STORAGE_PREFIX}:${type}`);
  } catch {
    return null;
  }
}

function rememberLastUsedTemplate(
  type: CsvImportDialogType,
  guid: string | null,
) {
  try {
    if (guid) localStorage.setItem(`${TEMPLATE_STORAGE_PREFIX}:${type}`, guid);
    else localStorage.removeItem(`${TEMPLATE_STORAGE_PREFIX}:${type}`);
  } catch {}
}

function mappingForTemplate(
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

function templateMatchesHeaders(
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

function inferredMapping(
  type: CsvImportDialogType,
  headers: string[],
  rows: string[][],
): CsvImportMapping {
  const inferred = inferCsvMapping(type, headers);
  return { ...inferred, composition: inferComposition(rows, inferred) };
}

function builtInPresetGuidForHeaders(
  type: CsvImportDialogType,
  headers: string[],
): string {
  if (type !== "orders") return "";
  const preset = CSV_IMPORT_PRESET_FOR_SOURCE[
    detectSource(headers.map((header) => header.toLowerCase()))
  ];
  return preset ? `builtin:${preset}` : "";
}

export function CsvImportDialog({
  open,
  onOpenChange,
  type,
  title,
  description,
  importLabel,
  onImport,
}: CsvImportDialogProps) {
  const { t } = useTranslation("csvImport");
  const { t: tCommon } = useTranslation("common");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const form = useForm<CsvImportTextValues>({
    resolver: zodResolver(csvImportTextSchema),
    defaultValues: { text: "" },
    mode: "onChange",
  });
  const [mapping, setMapping] = useState<CsvImportMapping | null>(null);
  const [renames, setRenames] = useState<Record<number, string>>({});
  const [templateGuid, setTemplateGuid] = useState<string>("");
  const [pendingTemplateGuid, setPendingTemplateGuid] = useState<string | null>(
    null,
  );
  const [templateName, setTemplateName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (open) return;
    form.reset({ text: "" });
    setMapping(null);
    setRenames({});
    setTemplateGuid("");
    setPendingTemplateGuid(null);
    setTemplateName("");
    setIsImporting(false);
  }, [open, form]);

  const text = form.watch("text");
  const table = useMemo(() => parseCsvTable(text ?? ""), [text]);
  const isTabular = table.headers.length >= 2 && table.rows.length > 0;

  const templatesQuery = useQuery({
    ...importTemplatesQueryOptions(type, activeOrg?.id ?? ""),
    enabled: open,
  });
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);

  useEffect(() => {
    if (!isTabular) {
      setMapping(null);
      return;
    }
    setMapping(inferredMapping(type, table.headers, table.rows));
    setRenames({});
    const detected = templates.find((row) =>
      templateMatchesHeaders(row, table.headers),
    );
    if (detected) {
      setTemplateGuid(detected.guid);
      setPendingTemplateGuid(null);
      rememberLastUsedTemplate(type, detected.guid);
      setMapping(mappingForTemplate(detected, table.headers, type));
      setTemplateName("");
      return;
    }
    const savedGuid = lastUsedTemplateGuid(type);
    if (!savedGuid) {
      setTemplateGuid("");
      setPendingTemplateGuid(null);
      return;
    }
    const saved = templates.find((row) => row.guid === savedGuid);
    if (saved) {
      setTemplateGuid(saved.guid);
      setPendingTemplateGuid(null);
      setMapping(mappingForTemplate(saved, table.headers, type));
    } else if (savedGuid) {
      setTemplateGuid("");
      setPendingTemplateGuid(savedGuid);
    } else {
      setTemplateGuid(builtInPresetGuidForHeaders(type, table.headers));
    }
    setTemplateName("");
  }, [text, type, isTabular, templates, table]);

  useEffect(() => {
    if (!pendingTemplateGuid || !isTabular) return;
    const saved = templates.find((row) => row.guid === pendingTemplateGuid);
    if (!saved) return;
    setTemplateGuid(saved.guid);
    setPendingTemplateGuid(null);
    setMapping(mappingForTemplate(saved, table.headers, type));
  }, [pendingTemplateGuid, templates, isTabular, table.headers, type]);

  const ordersResult = useMemo(
    () =>
      mapping && isTabular && type === "orders"
        ? composeCsvOrders(table.rows, mapping)
        : null,
    [mapping, table.rows, isTabular, type],
  );

  const pickResult = useMemo(
    () =>
      mapping && isTabular && type === "picks"
        ? composeCsvPickEntries(table.rows, mapping)
        : null,
    [mapping, table.rows, isTabular, type],
  );

  const decklistEntries = useMemo(
    () => (isTabular || !text?.trim() ? [] : parseDecklist(text)),
    [isTabular, text],
  );

  const renamedOrders = useMemo(
    () =>
      (ordersResult?.orders ?? []).map((order, index) => ({
        ...order,
        reference: renames[index] ?? order.reference,
      })),
    [ordersResult, renames],
  );

  const missingFields = mapping ? missingRequiredCsvFields(type, mapping) : [];

  const assignField = (field: CsvImportField | null, columnIndex: number) => {
    setMapping((current) => {
      if (!current) return current;
      const columns = { ...current.columns };
      if (field === null) {
        for (const [key, index] of Object.entries(columns)) {
          if (index === columnIndex) delete columns[key as CsvImportField];
        }
      } else {
        columns[field] = columnIndex;
      }
      return { ...current, columns };
    });
  };

  const fieldForColumn = (columnIndex: number): CsvImportField | null => {
    if (!mapping) return null;
    for (const [key, index] of Object.entries(mapping.columns)) {
      if (index === columnIndex) return key as CsvImportField;
    }
    return null;
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
        queryKey: ["import-templates", activeOrg?.id, type],
      });
    },
    onError: () => toast.error(t("templates.saveFailed")),
  });

  const applyTemplate = (guid: string) => {
    setTemplateGuid(guid);
    setPendingTemplateGuid(null);
    rememberLastUsedTemplate(type, guid.startsWith("builtin:") ? null : guid || null);
    if (!isTabular) return;
    if (guid === "") {
      setMapping(inferredMapping(type, table.headers, table.rows));
      return;
    }
    if (guid.startsWith("builtin:")) {
      const preset = guid.slice("builtin:".length) as "shopify" | "tcgplayer";
      const presetMapping = inferCsvMappingForPreset(type, table.headers, preset);
      setMapping({
        ...presetMapping,
        composition: inferComposition(table.rows, presetMapping),
      });
      return;
    }
    const saved = templates.find((row) => row.guid === guid);
    if (saved) setMapping(mappingForTemplate(saved, table.headers, type));
  };

  const canImport =
    !isImporting &&
    (isTabular
      ? mapping !== null &&
        missingFields.length === 0 &&
        (type === "orders"
          ? (ordersResult?.orders.length ?? 0) > 0
          : (pickResult?.entries.length ?? 0) > 0)
      : decklistEntries.length > 0);

  const submit = async () => {
    setIsImporting(true);
    try {
      let success = false;
      if (isTabular && mapping) {
        success =
          type === "orders"
            ? await onImport({
                type: "orders",
                orders: renamedOrders,
                source: detectSource(
                  table.headers.map((header) => header.toLowerCase()),
                ),
              })
            : await onImport({
                type: "picks",
                entries: composeCsvPickEntries(table.rows, mapping).entries,
              });
      } else {
        success =
          type === "orders"
            ? await onImport({
                type: "orders",
                orders: [
                  {
                    reference: renames[0]?.trim() || null,
                    customerName: null,
                    customerContact: null,
                    shippingAddress: null,
                    orderNote: null,
                    carrier: null,
                    trackingNumber: null,
                    lines: decklistEntries.map((entry) => ({
                      name: entry.name,
                      quantity: entry.quantity,
                    })),
                  },
                ],
                source: "generic",
              })
            : await onImport({ type: "picks", entries: decklistEntries });
      }
      if (success) onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  const readFile = ({ text: fileText }: CardListFile) => {
    form.setValue("text", fileText, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const fieldsByScope = (scope: CsvFieldScope) =>
    CSV_IMPORT_FIELDS[type].filter((spec) => spec.scope === scope);

  const renderColumnMenu = (header: string, columnIndex: number) => {
    const assigned = fieldForColumn(columnIndex);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto w-full justify-between px-2 text-left font-medium"
              aria-label={t("column.assign", { column: header })}
            />
          }
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-control">{header}</span>
            {assigned && (
              <span className="text-2xs text-foreground/70">
                {t(`fields.${assigned}`)}
              </span>
            )}
          </span>
          <IconChevronDown className="size-3.5 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => assignField(null, columnIndex)}>
            <IconX />
            {t("column.ignore")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {(["order", "item"] as const)
            .filter((scope) => type !== "picks" || scope === "item")
            .map((scope) => (
              <DropdownMenuGroup key={scope}>
                <DropdownMenuLabel>
                  {t(`column.${scope}Fields`)}
                </DropdownMenuLabel>
                {fieldsByScope(scope).map((spec) => (
                  <DropdownMenuItem
                    key={spec.key}
                    onClick={() => assignField(spec.key, columnIndex)}
                  >
                    {t(`fields.${spec.key}`)}
                    {spec.required ? ` (${t("column.required")})` : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-3xl"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button type="submit" form="csv-import-form" disabled={!canImport}>
            {isImporting && <IconLoader2 className="animate-spin" />}
            {importLabel}
          </Button>
        </>
      }
    >
      <form
        id="csv-import-form"
        className="flex flex-col gap-3 md:gap-2 md:max-h-[68svh] md:overflow-y-auto md:pr-1"
        onSubmit={form.handleSubmit(submit)}
      >
        <Controller
          name="text"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="csv-import-text">
                  {t("contents.label")}
                </FieldLabel>
                <CardListFileButton onFileRead={readFile} />
              </div>
              <Textarea
                {...field}
                id="csv-import-text"
                rows={6}
                className="max-h-[30svh] overflow-y-auto font-mono max-md:max-h-[24svh]"
                placeholder={t("contents.placeholder")}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />

        {text?.trim() && !isTabular && (
          <Callout variant={decklistEntries.length > 0 ? "info" : "warning"}>
            {decklistEntries.length > 0
              ? t("fallback.decklist", { count: decklistEntries.length })
              : t("fallback.unrecognized")}
          </Callout>
        )}

        {text?.trim() && !isTabular && type === "orders" && (
          <Field>
            <FieldLabel htmlFor="csv-import-order-name">
              {t("orders.nameLabel")}
            </FieldLabel>
            <Input
              id="csv-import-order-name"
              value={renames[0] ?? ""}
              onChange={(event) =>
                setRenames((current) => ({ ...current, 0: event.target.value }))
              }
              maxLength={CSV_IMPORT_NAME_MAX_LENGTH}
            />
          </Field>
        )}

        {isTabular && mapping && (
          <>
            {type === "orders" && (
              <Field>
                <FieldLabel htmlFor="csv-import-composition">
                  {t("composition.label")}
                </FieldLabel>
                <Select
                  value={mapping.composition}
                  onValueChange={(composition) =>
                    composition && setMapping({ ...mapping, composition })
                  }
                >
                  <SelectTrigger id="csv-import-composition" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["reference", "master-detail", "single"] as const).map(
                      (composition) => (
                        <SelectItem key={composition} value={composition}>
                          {t(`composition.${composition.replace("-", "")}`)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="shrink-0 overflow-x-auto rounded-lg ring-1 ring-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.headers.map((header, index) => (
                      <TableHead key={`${header}-${index}`} className="min-w-32">
                        {renderColumnMenu(header, index)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows
                    .slice(0, CSV_IMPORT_PREVIEW_ROWS)
                    .map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {table.headers.map((_, columnIndex) => (
                          <TableCell
                            key={columnIndex}
                            className="max-w-48 truncate text-xs"
                            title={row[columnIndex]}
                          >
                            {row[columnIndex]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {missingFields.length > 0 && (
              <Callout variant="warning">
                {t("validation.missingFields", {
                  fields: missingFields
                    .map((field) => t(`fields.${field}`))
                    .join(", "),
                })}
              </Callout>
            )}

            {type === "orders" && ordersResult && (
              <div className="flex flex-col gap-2">
                <p className="text-control font-medium">{t("orders.title")}</p>
                {renamedOrders.length === 0 && (
                  <p className="text-xs text-foreground/70">{t("orders.empty")}</p>
                )}
                {renamedOrders.map((order, index) => (
                  <DerivedOrderRow
                    key={index}
                    order={order}
                    index={index}
                    onRename={(value) =>
                      setRenames((current) => ({ ...current, [index]: value }))
                    }
                  />
                ))}
                {(ordersResult.skippedRows > 0 ||
                  ordersResult.emptyOrders > 0 ||
                  ordersResult.conflicts.length > 0) && (
                  <div role="status">
                    <Callout variant="warning">
                      {[
                        ordersResult.skippedRows > 0
                          ? t("orders.skippedRows", {
                              count: ordersResult.skippedRows,
                            })
                          : null,
                        ordersResult.emptyOrders > 0
                          ? t("orders.emptyOrders", {
                              count: ordersResult.emptyOrders,
                            })
                          : null,
                        ordersResult.conflicts.length > 0
                          ? t("orders.conflicts", {
                              count: ordersResult.conflicts.length,
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Callout>
                  </div>
                )}
              </div>
            )}

            {type === "picks" && pickResult && (
              <div role="status">
                <Callout
                  variant={pickResult.entries.length > 0 ? "info" : "warning"}
                >
                  {pickResult.entries.length > 0
                    ? t("picks.entries", { count: pickResult.entries.length })
                    : t("picks.noEntries")}
                  {pickResult.skippedRows > 0
                    ? ` ${t("orders.skippedRows", { count: pickResult.skippedRows })}`
                    : ""}
                </Callout>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <Field className="min-w-48 flex-1">
                <FieldLabel htmlFor="csv-import-template">
                  {t("templates.label")}
                </FieldLabel>
                <Select value={templateGuid} onValueChange={(guid) => guid !== null && applyTemplate(guid)}>
                  <SelectTrigger id="csv-import-template" className="w-full">
                    <SelectValue placeholder={t("templates.none")}>
                      {templateGuid.startsWith("builtin:")
                        ? t(
                            `templates.builtin.${templateGuid.slice("builtin:".length)}`,
                          )
                        : (templates.find((row) => row.guid === templateGuid)
                            ?.name ?? undefined)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("templates.none")}</SelectItem>
                    {CSV_IMPORT_BUILT_IN_PRESETS[type].map((preset) => (
                      <SelectItem key={preset} value={`builtin:${preset}`}>
                        {t(`templates.builtin.${preset}`)}
                      </SelectItem>
                    ))}
                    {templates.map((row) => (
                      <SelectItem key={row.guid} value={row.guid}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={t("templates.namePlaceholder")}
                aria-label={t("templates.namePlaceholder")}
                maxLength={CSV_IMPORT_NAME_MAX_LENGTH}
                className="min-w-40 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!templateName.trim() || !mapping || saveTemplate.isPending}
                onClick={() => saveTemplate.mutate()}
              >
                {saveTemplate.isPending && <IconLoader2 className="animate-spin" />}
                {t("templates.save")}
              </Button>
            </div>
          </>
        )}
      </form>
    </DynamicDialog>
  );
}

function DerivedOrderRow({
  order,
  index,
  onRename,
}: {
  order: ComposedCsvOrder;
  index: number;
  onRename: (value: string) => void;
}) {
  const { t } = useTranslation("csvImport");
  const quantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const revenue = order.lines.reduce(
    (sum, line) => sum + (line.unitPrice ?? 0) * line.quantity,
    0,
  );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 ring-1 ring-border">
      <Input
        value={order.reference ?? ""}
        onChange={(event) => onRename(event.target.value)}
        placeholder={t("orders.referencePlaceholder")}
        aria-label={t("orders.referenceLabel", { index: index + 1 })}
        maxLength={CSV_IMPORT_NAME_MAX_LENGTH}
        className="h-7 min-w-40 flex-1"
      />
      <Badge variant="secondary">
        {t("orders.lineCount", { count: order.lines.length })}
      </Badge>
      <Badge variant="secondary">
        {t("orders.quantity", { count: quantity })}
      </Badge>
      {revenue > 0 && (
        <Badge variant="secondary">
          {t("orders.revenue", {
            value: revenue.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            }),
          })}
        </Badge>
      )}
      {order.customerName && (
        <Badge variant="secondary">{order.customerName}</Badge>
      )}
    </div>
  );
}
