import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { documentScannerKey } from "@/features/scanner/lib/document-scan-bridge";
import type { DocumentScanPanelProps } from "@/lib/interfaces/scanner";
import {
  IconEye,
  IconFolder,
  IconLoader2,
  IconPlayerStop,
  IconRefresh,
  IconScan,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DocumentScanPanel({
  documentScan,
  isImportRunning,
}: DocumentScanPanelProps) {
  const { t } = useTranslation("cards");
  const {
    activeScan,
    isStopping,
    scanError,
    scanners,
    selectedScanner,
    folderPath,
  } = documentScan;

  return (
    <section className="flex flex-col gap-3 rounded-lg p-3 ring-1 ring-border">
      <p className="text-sm font-medium">
        {t("importScans.documentScan.title")}
      </p>

      {activeScan ? (
        <div className="flex items-center gap-2 text-sm">
          <IconLoader2 className="size-4 shrink-0 animate-spin text-foreground/70 motion-reduce:animate-none" />
          <span className="min-w-0 flex-1 truncate" title={activeScan.sourceLabel}>
            {activeScan.settings.source === "folder"
              ? t("importScans.documentScan.watching", {
                  folder: activeScan.sourceLabel,
                })
              : t("importScans.documentScan.scanning", {
                  scanner: activeScan.sourceLabel,
                })}
          </span>
          <Button
            variant="outline"
            disabled={isStopping}
            onClick={documentScan.stopScan}
          >
            <IconPlayerStop />
            {isStopping
              ? t("importScans.documentScan.stopping")
              : activeScan.settings.source === "folder"
                ? t("importScans.documentScan.stopWatching")
                : t("importScans.documentScan.stopScanner")}
          </Button>
        </div>
      ) : (
        <>
          {documentScan.isScannerHelperInstalled && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-foreground/70">
                {t("importScans.documentScan.scannerLabel")}
              </span>
              {documentScan.isLoadingScanners ? (
                <Skeleton className="h-6 w-full" />
              ) : scanners.length > 0 && selectedScanner ? (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={documentScannerKey(selectedScanner)}
                    onValueChange={(scannerKey) => {
                      if (scannerKey) documentScan.selectScanner(scannerKey);
                    }}
                  >
                    <SelectTrigger
                      className="min-w-0 flex-1"
                      aria-label={t("importScans.documentScan.scannerLabel")}
                    >
                      <SelectValue>{selectedScanner.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {scanners.map((scanner) => (
                        <SelectItem
                          key={documentScannerKey(scanner)}
                          value={documentScannerKey(scanner)}
                        >
                          {t("importScans.documentScan.scannerOption", {
                            name: scanner.name,
                            driver: scanner.driver.toUpperCase(),
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={documentScan.isRefreshingScanners}
                    aria-label={t("importScans.documentScan.refresh")}
                    onClick={documentScan.refreshScanners}
                  >
                    <IconRefresh />
                  </Button>
                  <Button
                    disabled={isImportRunning}
                    onClick={documentScan.startScannerScan}
                  >
                    <IconScan />
                    {t("importScans.documentScan.scan")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="min-w-0 flex-1 text-xs text-foreground/70">
                    {t("importScans.documentScan.noScanners")}
                  </p>
                  <Button
                    variant="outline"
                    disabled={documentScan.isRefreshingScanners}
                    onClick={documentScan.refreshScanners}
                  >
                    <IconRefresh />
                    {t("importScans.documentScan.refresh")}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-foreground/70">
              {t("importScans.documentScan.folderLabel")}
            </span>
            <div className="flex items-center gap-1.5">
              <p
                className="min-w-0 flex-1 truncate text-xs text-foreground/70"
                title={folderPath ?? undefined}
              >
                {folderPath ?? t("importScans.documentScan.noFolder")}
              </p>
              <Button variant="outline" onClick={documentScan.chooseFolder}>
                <IconFolder />
                {folderPath
                  ? t("importScans.documentScan.changeFolder")
                  : t("importScans.documentScan.chooseFolder")}
              </Button>
              <Button
                variant="outline"
                disabled={!folderPath || isImportRunning}
                onClick={documentScan.startFolderWatch}
              >
                <IconEye />
                {t("importScans.documentScan.watchFolder")}
              </Button>
            </div>
          </div>
        </>
      )}

      {scanError && (
        <Callout variant="error">
          {t(`importScans.documentScan.errors.${scanError.reason}`)}
        </Callout>
      )}
    </section>
  );
}
