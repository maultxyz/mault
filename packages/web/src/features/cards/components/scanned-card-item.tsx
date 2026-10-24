import { NEW_CARD_ANIMATION_WINDOW_MS } from "@/lib/constants/card-grid";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FoilOverlay } from "@/components/foil-overlay";
import { BinLocationDiagram } from "@/features/bins/components/bin-location-diagram";
import type { ScannedCardItemProps } from "@/lib/interfaces/cards";
import { ReviewStatusIcon } from "@/features/cards/components/review-status-icon";
import { StorageLocationBadge } from "@/features/cards/components/storage-location-badge";
import { usePriceSource } from "@/hooks/use-price-source";
import { cn, matchPercent as getMatchPercent } from "@/lib/utils";
import { IconDownload, IconSparkles } from "@tabler/icons-react";
import { DEFAULT_CARD_CONDITION } from "@magic-vault/shared";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { raritySwatch } from "@/lib/card-swatches";

export const ScannedCardItem = memo(function ScannedCardItem({
  card,
  scannedAt,
  onOpen,
  binNumber,
  isSelected = false,
  onToggleSelect,
  hasAlternatives = false,
  lowConfidenceMatch = false,
  wasCorrected = false,
  isReviewed = false,
  isFoil = false,
  foilType,
  condition,
  isDownloaded = false,
  quantity = 1,
  showBinLocation = true,
  storageLocation,
}: ScannedCardItemProps) {
  const { t } = useTranslation("cards");
  const [isNew] = useState(
    () =>
      scannedAt != null &&
      Date.now() - scannedAt < NEW_CARD_ANIMATION_WINDOW_MS,
  );
  const matchPercent = card.distance != null ? getMatchPercent(card) : 0;
  const { priceOf, format } = usePriceSource();
  const displayPrice = priceOf(card, isFoil, condition);
  const showReviewStatus = hasAlternatives || lowConfidenceMatch || isReviewed;
  return (
    <div
      className={cn(
        "relative rounded-lg p-1 bg-muted border transition-shadow",
        isNew &&
          "animate-in fade-in-0 zoom-in-90 slide-in-from-top-2 duration-500 motion-reduce:animate-none",
        isSelected && "ring-2 ring-primary ring-offset-1",
      )}
    >
      <button type="button" className="w-full cursor-pointer" onClick={onOpen}>
        <div className="aspect-[2.5/3.5] rounded-md overflow-hidden relative">
          <ReviewStatusIcon
            hasAlternatives={hasAlternatives}
            lowConfidenceMatch={lowConfidenceMatch}
            wasCorrected={wasCorrected}
            isReviewed={isReviewed}
            className="absolute top-1 left-1 z-20 shadow-md"
          />
          {isFoil && (
            <div
              className={cn(
                "absolute top-1 z-20 rounded-full p-0.5 shadow-md bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300",
                showReviewStatus ? "left-6" : "left-1",
              )}
              title={foilType ?? t("foil")}
            >
              <IconSparkles className="size-3 text-white" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 right-1 flex gap-1 items-center justify-between z-20">
            <div className="flex gap-1 items-center min-w-0">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge
                      variant={matchPercent >= 80 ? "default" : "destructive"}
                      className={
                        matchPercent >= 80
                          ? undefined
                          : "bg-destructive text-white"
                      }
                    >
                      {matchPercent.toFixed(2)}%
                    </Badge>
                  }
                />
                <TooltipContent>
                  {t("scannedCardItem.matchTooltip")}
                </TooltipContent>
              </Tooltip>
              {quantity > 1 && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge variant="default" className="shadow-md">
                        ×{quantity}
                      </Badge>
                    }
                  />
                  <TooltipContent>
                    {t("scannedCardItem.quantityTooltip", {
                      count: quantity,
                    })}
                  </TooltipContent>
                </Tooltip>
              )}
              {condition && condition !== DEFAULT_CARD_CONDITION && (
                <Badge variant="secondary" className="shadow-md">
                  {condition}
                </Badge>
              )}
            </div>
            {storageLocation ? (
              <StorageLocationBadge
                location={storageLocation}
                className="shadow-md"
              />
            ) : showBinLocation ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge variant="secondary" className="shadow-md">
                      {t("scannedCardItem.bin", { number: binNumber })}
                    </Badge>
                  }
                />
                <TooltipContent side="top" className="p-0">
                  <BinLocationDiagram binNumber={binNumber} />
                </TooltipContent>
              </Tooltip>
            ) : (
              <Badge variant="secondary" className="shadow-md">
                {t("scannedCardItem.bin", { number: binNumber })}
              </Badge>
            )}
          </div>
          <img
            src={card.image?.normal || ""}
            alt={card.name}
            className="w-full h-full object-cover"
          />
          {isFoil && <FoilOverlay />}
        </div>
      </button>
      {onToggleSelect && (
        <span
          className="absolute top-2 right-2 z-30 flex size-6 items-center justify-center rounded-md bg-background/80 shadow-sm backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.shiftKey) e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect({ shiftKey: e.shiftKey });
          }}
        >
          <Checkbox
            checked={isSelected}
            aria-label={t("scannedCardTable.selectRow", { name: card.name })}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(_, details) =>
              onToggleSelect({
                shiftKey:
                  details.event instanceof MouseEvent && details.event.shiftKey,
              })
            }
          />
        </span>
      )}
      <div className="flex flex-row justify-between items-center gap-2 px-1 pb-1">
        <div className="flex min-w-0 flex-row items-center gap-2">
          <div
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: raritySwatch(card.rarity).bg }}
          />
          <p
            className="truncate text-xs font-semibold uppercase"
            title={card.set}
          >
            {card.set}
          </p>
          <p className="shrink-0 text-xs text-foreground/70">
            #{card.collectorNumber}
          </p>
          {isDownloaded && (
            <span className="shrink-0" title={t("downloaded")}>
              <IconDownload className="size-3 text-foreground/70 shrink-0" />
            </span>
          )}
        </div>
        {displayPrice != null && (
          <p className="shrink-0 text-xs font-medium text-foreground/70">
            {format(displayPrice)}
          </p>
        )}
      </div>
    </div>
  );
});
