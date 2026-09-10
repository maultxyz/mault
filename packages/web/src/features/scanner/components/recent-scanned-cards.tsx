import { RECENT_SCANNED_CARDS_COUNT as RECENT_COUNT } from "@/lib/constants/limits";
import type { ScannedCard } from "@magic-vault/shared";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { formatUsd } from "./scan-stats";

function RecentCardRow({ card, binNumber, isFoil }: ScannedCard) {
  const displayPrice = (isFoil ? card.priceFoil : card.price) ?? card.price;
  return (
    <div className="flex items-center gap-2">
      <div className="relative shrink-0 rounded-md overflow-hidden border bg-muted w-9 aspect-[2.5/3.5]">
        <img
          src={card.image?.normal || ""}
          alt={card.name}
          className="w-full h-full object-cover"
        />
        {isFoil && (
          <div className="absolute top-0.5 left-0.5 rounded-full bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300 p-0.5 shadow-md">
            <IconSparkles className="size-2.5 text-white" />
          </div>
        )}
        {binNumber != null && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-background/90 px-1 text-[9px] font-medium leading-tight shadow">
            {binNumber}
          </span>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <p className="text-xs font-medium truncate">{card.name}</p>
        {displayPrice != null && (
          <p className="text-xs text-muted-foreground">
            {formatUsd(displayPrice)}
          </p>
        )}
      </div>
    </div>
  );
}

export function RecentScannedCards({ cards }: { cards: ScannedCard[] }) {
  const { t } = useTranslation("scanner");

  if (cards.length === 0) return null;

  const recent = cards.slice(0, RECENT_COUNT);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {t("recentScannedCards.heading")}
      </p>
      <div className="flex flex-col gap-2">
        {recent.map((entry) => (
          <RecentCardRow key={entry.scanId} {...entry} />
        ))}
      </div>
    </div>
  );
}
