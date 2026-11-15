import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { columnSampleValues } from "@/features/business/lib/pick-import";
import {
  PICK_IMPORT_FIELDS,
  PICK_IMPORT_NO_COLUMN,
} from "@/lib/constants/business";
import {
  CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX,
  CSV_IMPORT_PREVIEW_ROWS,
  CSV_IMPORT_SAMPLE_VALUE_COUNT,
} from "@/lib/constants/csv-import";
import type { PickImportColumnsProps } from "@/lib/interfaces/business";
import {
  CSV_IMPORT_BUILT_IN_PRESETS,
  CSV_IMPORT_FIELDS,
  CSV_IMPORT_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PickImportColumns({ csvImport }: PickImportColumnsProps) {
  const { t } = useTranslation("csvImport");
  const { table, mapping } = csvImport;
  if (!mapping) return null;

  const columnLabel = (index: number) =>
    table.headers[index]?.trim() ||
    t("pickImport.columns.columnNumber", { index: index + 1 });
  const isRequired = (field: string) =>
    CSV_IMPORT_FIELDS.orders.some(
      (spec) => spec.key === field && spec.required,
    );
  const templateLabel = (guid: string) => {
    if (guid === "") return t("pickImport.columns.automatic");
    if (guid.startsWith(CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX)) {
      return t(
        `templates.builtin.${guid.slice(CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX.length)}`,
      );
    }
    return csvImport.templates.find((row) => row.guid === guid)?.name ?? "";
  };

  return (
    <div className="flex flex-col gap-4 md:gap-3">
      <Field className="max-w-sm">
        <FieldLabel htmlFor="pick-import-layout">
          {t("pickImport.columns.layout")}
        </FieldLabel>
        <Select
          value={csvImport.templateGuid}
          onValueChange={(guid) => guid !== null && csvImport.applyTemplate(guid)}
        >
          <SelectTrigger id="pick-import-layout" className="w-full">
            <SelectValue>{templateLabel(csvImport.templateGuid)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("pickImport.columns.automatic")}</SelectItem>
            {CSV_IMPORT_BUILT_IN_PRESETS.orders.map((preset) => (
              <SelectItem
                key={preset}
                value={`${CSV_IMPORT_BUILT_IN_TEMPLATE_PREFIX}${preset}`}
              >
                {t(`templates.builtin.${preset}`)}
              </SelectItem>
            ))}
            {csvImport.templates.map((row) => (
              <SelectItem key={row.guid} value={row.guid}>
                {row.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{t("pickImport.columns.layoutHint")}</FieldDescription>
      </Field>

      <ul className="flex flex-col divide-y divide-border rounded-card bg-card">
        {PICK_IMPORT_FIELDS.map((field) => {
          const columnIndex = mapping.columns[field];
          const selectId = `pick-import-field-${field}`;
          const hintId = `${selectId}-hint`;
          const samples =
            columnIndex === undefined
              ? []
              : columnSampleValues(
                  table.rows,
                  columnIndex,
                  CSV_IMPORT_SAMPLE_VALUE_COUNT,
                );
          return (
            <li
              key={field}
              className="grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] md:items-center md:gap-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <label htmlFor={selectId} className="text-sm font-medium">
                  {t(`fields.${field}`)}
                  {isRequired(field) && (
                    <span className="ml-1.5 text-xs font-normal text-foreground/70">
                      {t("pickImport.columns.required")}
                    </span>
                  )}
                </label>
                <p id={hintId} className="text-xs text-foreground/70">
                  {t(`pickImport.fieldHints.${field}`)}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <Select
                  value={
                    columnIndex === undefined
                      ? PICK_IMPORT_NO_COLUMN
                      : String(columnIndex)
                  }
                  onValueChange={(value) =>
                    value !== null &&
                    csvImport.assignFieldToColumn(
                      field,
                      value === PICK_IMPORT_NO_COLUMN ? null : Number(value),
                    )
                  }
                >
                  <SelectTrigger
                    id={selectId}
                    aria-describedby={hintId}
                    className="w-full"
                  >
                    <SelectValue>
                      {columnIndex === undefined
                        ? t("pickImport.columns.notInFile")
                        : columnLabel(columnIndex)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PICK_IMPORT_NO_COLUMN}>
                      {t("pickImport.columns.notInFile")}
                    </SelectItem>
                    {table.headers.map((_, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {columnLabel(index)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {columnIndex !== undefined && (
                  <p className="truncate text-xs text-foreground/70">
                    {samples.length > 0
                      ? t("pickImport.columns.samples", {
                          values: samples.join(", "),
                        })
                      : t("pickImport.columns.noSamples")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {csvImport.missingFields.length > 0 && (
        <div role="status">
          <Callout variant="warning">
            {t("validation.missingFields", {
              fields: csvImport.missingFields
                .map((field) => t(`fields.${field}`))
                .join(", "),
            })}
          </Callout>
        </div>
      )}

      <section
        aria-labelledby="pick-import-save-layout"
        className="flex flex-col gap-2 rounded-card bg-card p-3"
      >
        <h3 id="pick-import-save-layout" className="text-sm font-medium">
          {t("pickImport.columns.saveLayout")}
        </h3>
        <p className="text-xs text-foreground/70">
          {t("pickImport.columns.saveLayoutHint")}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            value={csvImport.templateName}
            onChange={(event) => csvImport.setTemplateName(event.target.value)}
            placeholder={t("pickImport.columns.layoutNamePlaceholder")}
            aria-label={t("pickImport.columns.layoutName")}
            maxLength={CSV_IMPORT_NAME_MAX_LENGTH}
            className="min-w-48 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={
              !csvImport.templateName.trim() || csvImport.isSavingTemplate
            }
            onClick={csvImport.saveTemplate}
          >
            {csvImport.isSavingTemplate ? (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <IconDeviceFloppy />
            )}
            {t("pickImport.columns.save")}
          </Button>
        </div>
      </section>

      <details className="rounded-card bg-card">
        <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">
          {t("pickImport.columns.preview", {
            count: Math.min(CSV_IMPORT_PREVIEW_ROWS, table.rows.length),
          })}
        </summary>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers.map((_, index) => (
                  <TableHead key={index} className="min-w-28">
                    {columnLabel(index)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.slice(0, CSV_IMPORT_PREVIEW_ROWS).map((row, rowIndex) => (
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
      </details>
    </div>
  );
}
