import { Callout } from "@/components/callout";
import { CardListFileButton } from "@/components/card-list-file-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useCsvImport } from "@/hooks/use-csv-import";
import { CSV_IMPORT_PREVIEW_ROWS } from "@/lib/constants/csv-import";
import type { CardListFile } from "@/lib/interfaces/card-list-import";
import type { CsvImportDialogProps } from "@/lib/interfaces/csv-import";
import {
  CSV_IMPORT_FIELDS,
  CSV_IMPORT_NAME_MAX_LENGTH,
  composeCsvPickEntries,
  parseDecklist,
  type CsvImportField,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconChevronDown, IconLoader2, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { csvImportTextSchema, type CsvImportTextValues } from "@/schemas/csv-import.schema";

export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  importLabel,
  onImport,
}: CsvImportDialogProps) {
  const { t } = useTranslation("csvImport");
  const { t: tCommon } = useTranslation("common");
  const form = useForm<CsvImportTextValues>({
    resolver: zodResolver(csvImportTextSchema),
    defaultValues: { text: "" },
    mode: "onChange",
  });
  const text = useWatch({ control: form.control, name: "text" }) ?? "";
  const csvImport = useCsvImport({ type: "picks", text, enabled: open });
  const { table, isTabular, mapping, reset } = csvImport;
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (open) return;
    form.reset({ text: "" });
    reset();
    setIsImporting(false);
  }, [open, form, reset]);

  const pickResult = useMemo(
    () =>
      mapping && isTabular ? composeCsvPickEntries(table.rows, mapping) : null,
    [mapping, table.rows, isTabular],
  );
  const decklistEntries = useMemo(
    () => (isTabular || !text.trim() ? [] : parseDecklist(text)),
    [isTabular, text],
  );

  const canImport =
    !isImporting &&
    (isTabular
      ? mapping !== null &&
        csvImport.missingFields.length === 0 &&
        (pickResult?.entries.length ?? 0) > 0
      : decklistEntries.length > 0);

  const submit = async () => {
    setIsImporting(true);
    try {
      const entries =
        isTabular && pickResult ? pickResult.entries : decklistEntries;
      if (await onImport(entries)) onOpenChange(false);
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

  const fieldForColumn = (columnIndex: number): CsvImportField | null => {
    if (!mapping) return null;
    for (const [key, index] of Object.entries(mapping.columns)) {
      if (index === columnIndex) return key as CsvImportField;
    }
    return null;
  };

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
          <DropdownMenuItem
            onClick={() => csvImport.assignColumnToField(columnIndex, null)}
          >
            <IconX />
            {t("column.ignore")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {CSV_IMPORT_FIELDS.picks.map((spec) => (
            <DropdownMenuItem
              key={spec.key}
              onClick={() => csvImport.assignColumnToField(columnIndex, spec.key)}
            >
              {t(`fields.${spec.key}`)}
              {spec.required ? ` (${t("column.required")})` : ""}
            </DropdownMenuItem>
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
            {isImporting && (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            )}
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

        {text.trim() && !isTabular && (
          <Callout variant={decklistEntries.length > 0 ? "info" : "warning"}>
            {decklistEntries.length > 0
              ? t("fallback.decklist", { count: decklistEntries.length })
              : t("fallback.unrecognized")}
          </Callout>
        )}

        {isTabular && mapping && (
          <>
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

            {csvImport.missingFields.length > 0 && (
              <Callout variant="warning">
                {t("validation.missingFields", {
                  fields: csvImport.missingFields
                    .map((field) => t(`fields.${field}`))
                    .join(", "),
                })}
              </Callout>
            )}

            {pickResult && (
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
                <Select
                  value={csvImport.templateGuid}
                  onValueChange={(guid) =>
                    guid !== null && csvImport.applyTemplate(guid)
                  }
                >
                  <SelectTrigger id="csv-import-template" className="w-full">
                    <SelectValue placeholder={t("templates.none")}>
                      {csvImport.templates.find(
                        (row) => row.guid === csvImport.templateGuid,
                      )?.name ?? undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("templates.none")}</SelectItem>
                    {csvImport.templates.map((row) => (
                      <SelectItem key={row.guid} value={row.guid}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Input
                value={csvImport.templateName}
                onChange={(event) => csvImport.setTemplateName(event.target.value)}
                placeholder={t("templates.namePlaceholder")}
                aria-label={t("templates.namePlaceholder")}
                maxLength={CSV_IMPORT_NAME_MAX_LENGTH}
                className="min-w-40 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={
                  !csvImport.templateName.trim() || csvImport.isSavingTemplate
                }
                onClick={csvImport.saveTemplate}
              >
                {csvImport.isSavingTemplate && (
                  <IconLoader2 className="animate-spin motion-reduce:animate-none" />
                )}
                {t("templates.save")}
              </Button>
            </div>
          </>
        )}
      </form>
    </DynamicDialog>
  );
}
