import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import type { CardImageViewerProps } from "@/lib/interfaces/cards";
import { useTranslation } from "react-i18next";

export function CardImageViewer({
  open,
  onOpenChange,
  capturedImageUrl,
  showOcrRegions,
  onShowOcrRegionsChange,
}: CardImageViewerProps) {
  const { t } = useTranslation("cards");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[min(40rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between gap-4 pr-8">
          <DialogTitle>{t("cardDetailPanel.capturedScan")}</DialogTitle>
          <label className="flex items-center gap-2 text-xs text-foreground/70 shrink-0">
            {t("cardDetailPanel.showOcrRegions")}
            <Switch
              size="sm"
              checked={showOcrRegions}
              onCheckedChange={onShowOcrRegionsChange}
            />
          </label>
        </DialogHeader>
        <div className="mx-auto h-[min(75dvh,36rem)] max-w-full aspect-square rounded-lg overflow-hidden border">
          <CapturedImageThumb
            src={capturedImageUrl}
            alt={t("cardPicker.scannedAlt")}
            showOcrRegions={showOcrRegions}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
