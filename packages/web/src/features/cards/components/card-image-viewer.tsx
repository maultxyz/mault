import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DownloadScanImageButton } from "@/features/cards/components/download-scan-image-button";
import { CardImage } from "@/components/card-image";
import { ViewTabs } from "@/components/view-tabs";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { OcrRegionCrops } from "@/features/cards/components/ocr-region-crops";
import { OcrRegionOverlay } from "@/features/cards/components/ocr-region-overlay";
import type { CardImageViewerProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function CardImageViewer({
  open,
  onOpenChange,
  view,
  onViewChange,
  capturedImageUrl,
  referenceImageUrl,
  referenceAlt,
  showOcrRegions,
  onShowOcrRegionsChange,
  ocrRegions,
  printingMarks,
  download,
}: CardImageViewerProps) {
  const { t } = useTranslation("cards");
  const showsReference = view === "reference" || !capturedImageUrl;
  const showsRegions = showOcrRegions && !showsReference;
  const views = [
    ...(capturedImageUrl ? [{ key: "scan" as const, label: t("cardDetailPanel.capturedScan") }] : []),
    ...(referenceImageUrl ? [{ key: "reference" as const, label: t("cardDetailPanel.matchedCard") }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[min(40rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto",
          showsRegions && "md:max-w-[min(54rem,calc(100%-2rem))]",
        )}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 pr-8">
          <DialogTitle>
            {showsReference ? t("cardDetailPanel.matchedCard") : t("cardDetailPanel.capturedScan")}
          </DialogTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {onShowOcrRegionsChange && !showsReference && (
              <label className="flex items-center gap-2 text-xs text-foreground/70">
                {t("cardDetailPanel.showOcrRegions")}
                <Switch
                  size="sm"
                  aria-label={t("cardDetailPanel.showOcrRegions")}
                  checked={showOcrRegions}
                  onCheckedChange={onShowOcrRegionsChange}
                />
              </label>
            )}
            {download && !showsReference && <DownloadScanImageButton {...download} />}
          </div>
        </DialogHeader>
        {views.length > 1 && (
          <ViewTabs
            items={views}
            value={showsReference ? "reference" : "scan"}
            onChange={onViewChange}
            label={t("cardDetailPanel.imageViewerTabs")}
          />
        )}
        <div className="flex flex-col gap-4 md:gap-2 md:flex-row md:items-start">
          <div className="relative mx-auto h-[min(75dvh,36rem)] max-w-full aspect-[2.5/3.5] shrink-0 rounded-lg overflow-hidden border">
            {showsReference ? (
              <CardImage src={referenceImageUrl ?? undefined} alt={referenceAlt} loading="eager" />
            ) : (
              <CapturedImageThumb
                src={capturedImageUrl ?? ""}
                alt={t("cardPicker.scannedAlt")}
              />
            )}
            {showsRegions && (
              <OcrRegionOverlay
                showLabels
                regions={ocrRegions}
                printingMarks={printingMarks}
              />
            )}
          </div>
          {showsRegions && capturedImageUrl && (
            <OcrRegionCrops
              src={capturedImageUrl}
              regions={ocrRegions}
              printingMarks={printingMarks}
              className="min-w-0 md:w-80 md:shrink-0 md:max-h-[min(75dvh,36rem)] md:overflow-y-auto"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
