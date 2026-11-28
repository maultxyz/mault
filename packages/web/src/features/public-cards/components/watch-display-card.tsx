import { CardImage } from "@/components/card-image";
import { usePublicCardPrice } from "@/features/public-cards/api/use-public-card-price";
import { FOIL_GRADIENT_CLASS } from "@/lib/constants/ui";
import type { WatchDisplayCardProps } from "@/lib/interfaces/public-cards";
import { cn } from "@/lib/utils";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function WatchDisplayCard({ entry, showsPrices }: WatchDisplayCardProps) {
  const { t } = useTranslation("cards");
  const { formattedPrice } = usePublicCardPrice(entry);

  return (
    <li className="flex min-h-0 min-w-0 flex-col gap-1.5 animate-in fade-in slide-in-from-top-4 duration-500 motion-reduce:animate-none">
      <div className="flex min-h-0 flex-1 justify-center">
        <div className="relative aspect-[2.5/3.5] w-full max-w-full overflow-hidden rounded-lg md:h-full md:w-auto">
          {entry.isFoil && (
            <span
              className={cn("absolute top-1.5 left-1.5 z-20 rounded-full p-1 shadow-md", FOIL_GRADIENT_CLASS)}
            >
              <IconSparkles className="size-4 text-white" aria-hidden />
              <span className="sr-only">{entry.foilType ?? t("foil")}</span>
            </span>
          )}
          <CardImage
            src={entry.card.image?.normal || entry.card.image?.small}
            placeholderSrc={entry.card.image?.small}
            alt={entry.card.name}
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold 2xl:text-lg">
          {entry.card.name}
        </p>
        <p className="flex items-center justify-between gap-2 text-xs text-foreground/70 2xl:text-base">
          <span className="truncate uppercase">
            {entry.card.set}
            {entry.card.collectorNumber && ` #${entry.card.collectorNumber}`}
          </span>
          {showsPrices && formattedPrice && (
            <span className="shrink-0 font-semibold text-foreground tabular-nums">
              {formattedPrice}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
