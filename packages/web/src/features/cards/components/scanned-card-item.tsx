import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BinLocationDiagram } from "@/features/bins/components/bin-location-diagram";
import type { ScannedCardItemProps } from "@/features/cards/types";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { cn } from "@/lib/utils";
import {
  IconCheck,
  IconDownload,
  IconHelpCircle,
  IconSparkles,
} from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";

export const ScannedCardItem = memo(function ScannedCardItem({
  card,
  onOpen,
  binNumber,
  isSelected = false,
  onToggleSelect,
  hasAlternatives = false,
  isFoil = false,
  isDownloaded = false,
}: ScannedCardItemProps) {
  const { t } = useTranslation("cards");
  const displayPrice = (isFoil ? card.priceFoil : card.price) ?? card.price;
  return (
    <div
      className={cn(
        "relative rounded-lg p-1 bg-muted border transition-shadow",
        isSelected && "ring-2 ring-primary ring-offset-1",
      )}
    >
      <button type="button" className="w-full cursor-pointer" onClick={onOpen}>
        <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden relative">
          {hasAlternatives && (
            <div
              className="absolute top-1 left-1 z-20 rounded-full bg-amber-700 p-0.5 shadow-md"
              title={t("scannedCardItem.multipleMatchesTooltip")}
            >
              <IconHelpCircle className="size-3 text-white" />
            </div>
          )}
          {isFoil && (
            <div
              className={cn(
                "absolute top-1 z-20 rounded-full p-0.5 shadow-md bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300",
                hasAlternatives ? "left-6" : "left-1",
              )}
              title={t("scannedCardItem.foil")}
            >
              <IconSparkles className="size-3 text-white" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 right-1 flex gap-1 items-center justify-between z-20">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant={card.distance < 0.15 ? "default" : "destructive"}
                  >
                    {card.distance != null
                      ? (100 - card.distance * 100).toFixed(2)
                      : "0.00"}
                    %
                  </Badge>
                }
              />
              <TooltipContent>
                {t("scannedCardItem.matchTooltip")}
              </TooltipContent>
            </Tooltip>
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
          </div>
          <img
            src={card.image?.normal || ""}
            alt={card.name}
            className="w-full h-full object-cover"
          />
        </div>
      </button>
      {onToggleSelect && (
        <Button
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          variant={isSelected ? "default" : "secondary"}
          className="absolute top-2 right-2 z-30"
        >
          <IconCheck />
        </Button>
      )}
      <div className="flex flex-row justify-between items-center gap-2 px-1 pb-1">
        <div className="flex min-w-0 flex-row items-center gap-2">
          <div
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: `var(--${card.rarity})` }}
          />
          <p
            className="truncate text-xs font-semibold uppercase"
            title={card.set}
          >
            {card.set}
          </p>
          <p className="shrink-0 text-xs text-muted-foreground">
            #{card.collectorNumber}
          </p>
          {isDownloaded && (
            <span
              className="shrink-0"
              title={t("scannedCardItem.downloaded")}
            >
              <IconDownload className="size-3 text-muted-foreground shrink-0" />
            </span>
          )}
        </div>
        {displayPrice != null && (
          <p className="shrink-0 text-xs font-medium text-muted-foreground">
            {formatUsd(displayPrice)}
          </p>
        )}
      </div>
    </div>
  );
});
