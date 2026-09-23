import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FoilOverlay } from "@/components/foil-overlay";
import { BinLocationDiagram } from "@/features/bins/components/bin-location-diagram";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { RARITY_LABELS } from "@/lib/constants/rarity";
import type { ScannedCardItemProps } from "@/lib/interfaces/cards";
import { cn, matchPercentFromDistance } from "@/lib/utils";
import {
  IconCheck,
  IconDownload,
  IconHelpCircle,
  IconSparkles,
} from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";

export const ScannedCardListItem = memo(function ScannedCardListItem({
  card,
  onOpen,
  binNumber,
  isSelected = false,
  onToggleSelect,
  hasAlternatives = false,
  wasCorrected = false,
  isFoil = false,
  foilType,
  isDownloaded = false,
  quantity = 1,
}: ScannedCardItemProps) {
  const { t } = useTranslation("cards");
  const matchPercent =
    card.distance != null ? matchPercentFromDistance(card.distance) : 0;
  const displayPrice = (isFoil ? card.priceFoil : card.price) ?? card.price;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-1.5 pr-2 bg-muted border transition-shadow",
        isSelected && "ring-2 ring-primary ring-offset-1",
      )}
    >
      {onToggleSelect && (
        <Button
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          variant={isSelected ? "default" : "secondary"}
          className="shrink-0"
        >
          <IconCheck />
        </Button>
      )}
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        onClick={onOpen}
      >
        <div className="relative h-16 aspect-[2.5/3.5] shrink-0 rounded-md overflow-hidden">
          <img
            src={card.image?.normal || ""}
            alt={card.name}
            className="w-full h-full object-cover"
          />
          {isFoil && <FoilOverlay />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{card.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="uppercase">{card.set}</span> #
            {card.collectorNumber}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: `var(--${card.rarity})` }}
            />
            <p className="truncate text-xs text-muted-foreground">
              {RARITY_LABELS[card.rarity] ??
                card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
            </p>
          </div>
        </div>
        {hasAlternatives && (
          <span
            className={cn(
              "shrink-0 rounded-full p-0.5 shadow-md",
              wasCorrected ? "bg-green-600" : "bg-amber-700",
            )}
            title={
              wasCorrected
                ? t("scannedCardItem.multipleMatchesResolvedTooltip")
                : t("scannedCardItem.multipleMatchesTooltip")
            }
          >
            <IconHelpCircle className="size-3 text-white" />
          </span>
        )}
        {isFoil && (
          <span
            className="shrink-0 rounded-full p-0.5 shadow-md bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300"
            title={foilType ?? t("foil")}
          >
            <IconSparkles className="size-3 text-white" />
          </span>
        )}
        {isDownloaded && (
          <span className="shrink-0" title={t("downloaded")}>
            <IconDownload className="size-3.5 text-muted-foreground" />
          </span>
        )}
        {quantity > 1 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge variant="default" className="shrink-0">
                  ×{quantity}
                </Badge>
              }
            />
            <TooltipContent>
              {t("scannedCardItem.quantityTooltip", { count: quantity })}
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant={matchPercent >= 80 ? "default" : "destructive"}
                className={cn(
                  "shrink-0",
                  matchPercent < 80 && "bg-destructive text-white",
                )}
              >
                {matchPercent.toFixed(2)}%
              </Badge>
            }
          />
          <TooltipContent>{t("scannedCardItem.matchTooltip")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge variant="secondary" className="shrink-0">
                {t("scannedCardItem.bin", { number: binNumber })}
              </Badge>
            }
          />
          <TooltipContent side="top" className="p-0">
            <BinLocationDiagram binNumber={binNumber} />
          </TooltipContent>
        </Tooltip>
        {displayPrice != null && (
          <p className="shrink-0 w-16 text-right text-xs font-medium text-muted-foreground">
            {formatUsd(displayPrice)}
          </p>
        )}
      </button>
    </div>
  );
});
