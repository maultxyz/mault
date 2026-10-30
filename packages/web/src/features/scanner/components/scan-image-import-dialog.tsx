import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { DocumentScanPanel } from "@/features/scanner/components/document-scan-panel";
import { SCAN_IMAGE_IMPORT_ACCEPT } from "@/lib/constants/scanner";
import type {
  ScanImageImportDialogProps,
  ScanImageImportItem,
  ScanImageImportRowProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconLoader2,
  IconPhotoUp,
  IconQuestionMark,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function ScanImageImportRow({ item, isRunning }: ScanImageImportRowProps) {
  const { t } = useTranslation("cards");
  const isSkipped = item.status === "queued" && !isRunning;
  const detail =
    item.status === "matched"
      ? item.matchedCardName
      : item.status === "failed"
        ? item.failureMessage
        : isSkipped
          ? t("importScans.status.skipped")
          : t(`importScans.status.${item.status}`);

  return (
    <li className="flex items-center gap-2 px-3 py-1.5 text-sm">
      {item.status === "matched" && (
        <IconCircleCheck className="size-4 shrink-0 text-success" />
      )}
      {item.status === "unmatched" && (
        <IconQuestionMark className="size-4 shrink-0 text-warning" />
      )}
      {item.status === "failed" && (
        <IconAlertTriangle className="size-4 shrink-0 text-destructive" />
      )}
      {item.status === "identifying" && (
        <IconLoader2 className="size-4 shrink-0 animate-spin text-foreground/70" />
      )}
      {item.status === "queued" && (
        <IconClock className="size-4 shrink-0 text-foreground/70" />
      )}
      <span className="min-w-0 flex-1 truncate">{item.fileName}</span>
      <span
        className={cn(
          "max-w-1/2 truncate text-xs",
          item.status === "failed" ? "text-destructive" : "text-foreground/70",
        )}
      >
        {detail}
      </span>
    </li>
  );
}

export function ScanImageImportDialog({
  open,
  onOpenChange,
  scanImageImport,
  documentScan,
}: ScanImageImportDialogProps) {
  const { t } = useTranslation("cards");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { items, isRunning, importFiles, stop } = scanImageImport;

  const processedCount = items.filter(
    (item) => item.status !== "queued" && item.status !== "identifying",
  ).length;
  const countByStatus = (status: ScanImageImportItem["status"]) =>
    items.filter((item) => item.status === status).length;
  const hasItems = items.length > 0;
  const isDocumentScanActive = !!documentScan.activeScan;

  const chooseFiles = (files: FileList | null | undefined) => {
    if (!files || isRunning || isDocumentScanActive) return;
    importFiles(Array.from(files));
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("importScans.title")}
      description={t("importScans.description")}
      className="sm:max-w-xl data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
      footer={
        <>
          {isRunning && !isDocumentScanActive ? (
            <Button variant="outline" onClick={stop}>
              {t("importScans.stop")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("importScans.close")}
            </Button>
          )}
          {hasItems && !isRunning && !isDocumentScanActive && (
            <Button onClick={() => fileInputRef.current?.click()}>
              <IconPhotoUp />
              {t("importScans.importMore")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={SCAN_IMAGE_IMPORT_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            chooseFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {documentScan.isSupported && (
          <DocumentScanPanel
            documentScan={documentScan}
            isImportRunning={isRunning}
          />
        )}
        {!hasItems && (
          <>
            <Callout variant="info">{t("importScans.tip")}</Callout>
            <button
              type="button"
              className={cn(
                "flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-foreground/70 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground motion-reduce:transition-none",
                isDraggingOver && "border-primary/50 bg-primary/5 text-foreground",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingOver(false);
                chooseFiles(event.dataTransfer.files);
              }}
            >
              <IconPhotoUp className="size-5" />
              {t("importScans.dropZone")}
              <span className="text-xs">{t("importScans.dropZoneHint")}</span>
            </button>
          </>
        )}
        {hasItems && (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {t("importScans.progress", {
                  done: processedCount,
                  total: items.length,
                })}
              </p>
              <p className="text-xs text-foreground/70">
                {[
                  t("importScans.matchedCount", {
                    count: countByStatus("matched"),
                  }),
                  t("importScans.unmatchedCount", {
                    count: countByStatus("unmatched"),
                  }),
                  t("importScans.failedCount", {
                    count: countByStatus("failed"),
                  }),
                ].join(", ")}
              </p>
            </div>
            <ul className="max-h-[50dvh] min-h-0 divide-y overflow-y-auto rounded-lg border">
              {items.map((item) => (
                <ScanImageImportRow
                  key={item.id}
                  item={item}
                  isRunning={isRunning}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </DynamicDialog>
  );
}
