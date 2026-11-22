import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import type { CardReservationCardSummaryProps } from "@/lib/interfaces/card-reservations";
import { useTranslation } from "react-i18next";

export function CardReservationCardSummary({ card }: CardReservationCardSummaryProps) {
  const { t } = useTranslation("cards");
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <CardImage
        src={card.imageUrl ?? undefined}
        alt=""
        className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-control font-medium">{card.name}</span>
        <span className="truncate text-xs text-foreground/70">
          {[
            card.setName || card.setCode.toUpperCase(),
            card.collectorNumber ? `#${card.collectorNumber}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-1">
          <Badge variant="secondary">{card.condition}</Badge>
          {card.isFoil && <Badge variant="secondary">{card.foilType ?? t("foil")}</Badge>}
        </span>
      </div>
    </div>
  );
}
