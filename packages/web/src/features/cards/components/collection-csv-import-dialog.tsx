import { CardListFileButton } from "@/components/card-list-file-button";
import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectionCsvImport } from "@/features/cards/api/use-collection-csv-import";
import type {
  CollectionCsvImportDialogProps,
  CollectionCsvImportFile,
} from "@/lib/interfaces/cards";
import {
  collectionCsvFormatLabel,
  parseCollectionCsv,
} from "@magic-vault/shared";
import { IconAlertTriangle, IconFileSpreadsheet } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CollectionCsvImportDialog({
  open,
  onOpenChange,
  collectionGuid,
}: CollectionCsvImportDialogProps) {
  const { t } = useTranslation("cards");
  const { preview, importRows } = useCollectionCsvImport(collectionGuid);
  const [file, setFile] = useState<CollectionCsvImportFile | null>(null);
  const rows = file?.parsed.rows ?? [];
  const previewResult = preview.data;
  const canImport =
    !!previewResult &&
    previewResult.matchedCopies > 0 &&
    !preview.isPending &&
    !importRows.isPending;

  const reset = () => {
    setFile(null);
    preview.reset();
    importRows.reset();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const handleFileRead = ({ text, fileName }: { text: string; fileName: string }) => {
    const parsed = parseCollectionCsv(text);
    preview.reset();
    setFile({ fileName, parsed });
    if (parsed.hasNameColumn && parsed.rows.length > 0) preview.mutate(parsed.rows);
  };

  const handleImport = async () => {
    const imported = await importRows.mutateAsync(rows).catch(() => null);
    if (imported) handleOpenChange(false);
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("importCsv.title")}
      description={t("importCsv.description")}
      className="sm:max-w-lg data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
      footer={
        <Button
          type="button"
          className="w-full"
          disabled={!canImport}
          onClick={() => void handleImport()}
        >
          {t("importCsv.import", { count: previewResult?.matchedCopies ?? 0 })}
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <CardListFileButton onFileRead={handleFileRead} />
          {file && (
            <span className="flex min-w-0 items-center gap-1.5 text-control text-foreground/70">
              <IconFileSpreadsheet className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{file.fileName}</span>
            </span>
          )}
        </div>

        {file && (
          <div role="status" className="flex flex-col gap-3">
            {!file.parsed.hasNameColumn ? (
              <Callout variant="error" icon={IconAlertTriangle}>
                {t("importCsv.noNameColumn")}
              </Callout>
            ) : file.parsed.rows.length === 0 ? (
              <Callout variant="error" icon={IconAlertTriangle}>
                {t("importCsv.emptyFile")}
              </Callout>
            ) : (
              <>
                <p className="text-control text-foreground/70">
                  {t("importCsv.detectedFormat", {
                    format:
                      collectionCsvFormatLabel(file.parsed.format) ??
                      t("importCsv.genericFormat"),
                  })}
                  {file.parsed.skippedRows > 0 &&
                    ` ${t("importCsv.skipped", { count: file.parsed.skippedRows })}`}
                </p>
                {preview.isPending && (
                  <>
                    <span className="sr-only">{t("importCsv.checking")}</span>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-16 w-full" />
                  </>
                )}
                {preview.isError && (
                  <Callout variant="error" icon={IconAlertTriangle}>
                    {preview.error instanceof Error
                      ? preview.error.message
                      : t("importCsv.previewFailed")}
                  </Callout>
                )}
                {previewResult && (
                  <>
                    <p className="text-sm font-medium">
                      {t("importCsv.matched", { count: previewResult.matchedCopies })}
                    </p>
                    {previewResult.unmatchedRowCount > 0 && (
                      <Callout
                        variant="warning"
                        icon={IconAlertTriangle}
                        title={t("importCsv.unmatchedTitle", {
                          count: previewResult.unmatchedRowCount,
                        })}
                      >
                        <ul className="mt-1 flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                          {previewResult.unmatchedRows.map((row) => (
                            <li key={row.lineNumber}>
                              {t("importCsv.unmatchedLine", {
                                line: row.lineNumber,
                                quantity: row.quantity,
                                name: [row.name, row.setCode, row.collectorNumber]
                                  .filter(Boolean)
                                  .join(" · "),
                              })}
                            </li>
                          ))}
                        </ul>
                      </Callout>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DynamicDialog>
  );
}
