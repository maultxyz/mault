import { CardImage } from "@/components/card-image";
import { RarityBadge } from "@/components/rarity-badge";
import { Badge } from "@/components/ui/badge";
import { usePublicCardPrice } from "@/features/public-cards/api/use-public-card-price";
import { FOIL_GRADIENT_CLASS } from "@/lib/constants/ui";
import type { WatchDisplayCardProps } from "@/lib/interfaces/public-cards";
import { cn } from "@/lib/utils";
import { DEFAULT_CARD_LANGUAGE, scanLanguage } from "@magic-vault/shared";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function WatchDisplayHero({ entry, showsPrices }: WatchDisplayCardProps) {
  const { t } = useTranslation("cards");
  const { formattedPrice } = usePublicCardPrice(entry);
  const language = scanLanguage(entry);
  const showsLanguage = language !== (entry.card.lang || DEFAULT_CARD_LANGUAGE);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none 2xl:gap-6">
      <div className="flex min-h-0 w-full flex-1 justify-center">
        <div className="relative aspect-[2.5/3.5] w-full max-w-full overflow-hidden rounded-xl shadow-popover md:h-full md:w-auto">
          <CardImage
            src={entry.card.image?.normal || entry.card.image?.small}
            placeholderSrc={entry.card.image?.small}
            alt={entry.card.name}
            loading="eager"
          />
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col items-center gap-2 text-center 2xl:gap-3">
        <p className="line-clamp-2 font-heading text-3xl font-semibold md:text-4xl 2xl:text-6xl">
          {entry.card.name}
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lg text-foreground/70 md:text-xl 2xl:text-3xl">
          <RarityBadge rarity={entry.card.rarity} decorative />
          <span>{entry.card.setName}</span>
          {entry.card.collectorNumber && (
            <span className="tabular-nums">#{entry.card.collectorNumber}</span>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary">{entry.condition}</Badge>
          {entry.isFoil && (
            <Badge className={cn("text-white", FOIL_GRADIENT_CLASS)}>
              <IconSparkles aria-hidden />
              {entry.foilType ?? t("foil")}
            </Badge>
          )}
          {showsLanguage && <Badge variant="secondary">{language.toUpperCase()}</Badge>}
        </div>
        {showsPrices && formattedPrice && (
          <p className="font-heading text-4xl font-semibold tabular-nums md:text-5xl 2xl:text-7xl">
            {formattedPrice}
          </p>
        )}
      </div>
    </div>
  );
}
