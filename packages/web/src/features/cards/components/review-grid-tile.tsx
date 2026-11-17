import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useScanImage } from "@/features/cards/api/use-scan-image";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { ReviewStatusIcon } from "@/features/cards/components/review-status-icon";
import type { ReviewGridTileProps } from "@/lib/interfaces/cards";
import { IconCheck, IconPencil, IconPhotoOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ReviewGridTile({
  card,
  onAccept,
  onCorrect,
}: ReviewGridTileProps) {
  const { t } = useTranslation("cards");
  const { data: capturedImageUrl, isLoading: isCapturedImageLoading } =
    useScanImage(card.collectionGuid, card.scanId);
  const matchedImageUrl = card.card.image?.normal || card.card.image?.small;

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-2 animate-in fade-in-0 motion-reduce:animate-none">
      <div className="grid grid-cols-2 gap-2">
        <figure className="flex min-w-0 flex-col gap-1">
          <figcaption className="text-2xs text-foreground/70">
            {t("cardDetailPanel.capturedScan")}
          </figcaption>
          <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md border bg-muted">
            {capturedImageUrl ? (
              <CapturedImageThumb
                src={capturedImageUrl}
                alt={t("cardPicker.scannedAlt")}
              />
            ) : isCapturedImageLoading ? (
              <Skeleton className="h-full w-full rounded-none" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-2xs text-foreground/70">
                <IconPhotoOff className="size-4" />
                {t("reviewGrid.noPhoto")}
              </div>
            )}
          </div>
        </figure>
        <figure className="flex min-w-0 flex-col gap-1">
          <figcaption className="text-2xs text-foreground/70">
            {t("cardDetailPanel.matchedCard")}
          </figcaption>
          <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md border bg-muted">
            {matchedImageUrl && (
              <img
                src={matchedImageUrl}
                alt={card.card.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </figure>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 px-0.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={card.card.name}>
            {card.card.name}
          </p>
          <p className="truncate text-xs text-foreground/70">
            {card.card.set.toUpperCase()} #{card.card.collectorNumber}
          </p>
        </div>
        <ReviewStatusIcon
          hasAlternatives={card.hasAlternatives}
          lowConfidenceMatch={card.lowConfidenceMatch}
          wasCorrected={card.corrected}
        />
      </div>
      <div className="flex gap-1.5">
        <Button className="flex-1" onClick={onAccept}>
          <IconCheck />
          {t("reviewGrid.accept")}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onCorrect}>
          <IconPencil />
          {t("reviewGrid.correct")}
        </Button>
      </div>
    </div>
  );
}
