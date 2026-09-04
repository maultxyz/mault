import type { DemoScannedCard } from "@/app/routes/landing/demo-cards";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DemoCardTile({ card, binNumber, isFoil }: DemoScannedCard) {
  const { t } = useTranslation("cards");
  const displayPrice = (isFoil ? card.priceFoil : card.price) ?? card.price;

  return (
    <div className="relative rounded-lg border p-1 bg-background">
      <div className="relative aspect-5/7 overflow-hidden rounded-lg">
        {isFoil && (
          <div
            className="absolute top-1 left-1 z-20 rounded-full bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300 p-0.5 shadow-md"
            title={t("scannedCardItem.foil")}
          >
            <IconSparkles className="size-3 text-white" />
          </div>
        )}
        <div className="absolute right-1 bottom-1 left-1 z-20 flex items-center justify-between gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  variant={card.distance < 0.15 ? "default" : "destructive"}
                >
                  {(100 - card.distance * 100).toFixed(2)}%
                </Badge>
              }
            />
            <TooltipContent>{t("scannedCardItem.matchTooltip")}</TooltipContent>
          </Tooltip>
          <Badge variant="secondary" className="shadow-md">
            {t("scannedCardItem.bin", { number: binNumber })}
          </Badge>
        </div>
        <img
          src={card.image?.normal || ""}
          alt={card.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-row items-center justify-between px-1 pt-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: `var(--${card.rarity})` }}
          />
          <p className="truncate text-[0.6rem] font-medium">{card.name}</p>
        </div>
        {displayPrice != null && (
          <p className="shrink-0 text-[0.6rem] text-foreground/70">
            {formatUsd(displayPrice)}
          </p>
        )}
      </div>
    </div>
  );
}
