import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { OcrRegionCrops } from "@/features/cards/components/ocr-region-crops";
import { OcrRegionOverlay } from "@/features/cards/components/ocr-region-overlay";
import type { CardImageViewerProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function CardImageViewer({
  open,
  onOpenChange,
  capturedImageUrl,
  showOcrRegions,
  onShowOcrRegionsChange,
  ocrRegions,
  printingMarks,
}: CardImageViewerProps) {
  const { t } = useTranslation("cards");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[min(40rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto",
          showOcrRegions && "md:max-w-[min(54rem,calc(100%-2rem))]",
        )}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 pr-8">
          <DialogTitle>{t("cardDetailPanel.capturedScan")}</DialogTitle>
          {onShowOcrRegionsChange && (
            <label className="flex items-center gap-2 text-xs text-foreground/70 shrink-0">
              {t("cardDetailPanel.showOcrRegions")}
              <Switch
                size="sm"
                aria-label={t("cardDetailPanel.showOcrRegions")}
                checked={showOcrRegions}
                onCheckedChange={onShowOcrRegionsChange}
              />
            </label>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-4 md:gap-2 md:flex-row md:items-start">
          <div className="relative mx-auto h-[min(75dvh,36rem)] max-w-full aspect-[2.5/3.5] shrink-0 rounded-lg overflow-hidden border">
            <CapturedImageThumb
              src={capturedImageUrl}
              alt={t("cardPicker.scannedAlt")}
            />
            {showOcrRegions && (
              <OcrRegionOverlay
                showLabels
                regions={ocrRegions}
                printingMarks={printingMarks}
              />
            )}
          </div>
          {showOcrRegions && (
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
