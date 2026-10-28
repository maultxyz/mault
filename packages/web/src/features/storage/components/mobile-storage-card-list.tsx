import { FoilOverlay } from "@/components/foil-overlay";
import { ReviewStatusIcon } from "@/features/cards/components/review-status-icon";
import { usePriceSource } from "@/hooks/use-price-source";
import { MOBILE_LIST_CLASS, MOBILE_LIST_ROW_CLASS } from "@/lib/constants/nav";
import type { StorageCardListProps } from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";

export function MobileStorageCardList({
  entries,
  onOpenLocation,
  onOpenCard,
}: StorageCardListProps) {
  const { t } = useTranslation("storage");
  const { priceOf, format } = usePriceSource();

  return (
    <div className={MOBILE_LIST_CLASS}>
      {entries.map((entry) => {
        const price = priceOf(
          entry.card,
          { isFoil: entry.isFoil, foilType: entry.foilType },
          entry.condition,
        );
        return (
          <button
            key={`${entry.locationGuid}-${entry.scanId}`}
            type="button"
            onClick={() => onOpenCard(entry)}
            className={MOBILE_LIST_ROW_CLASS}
          >
            <span className="relative aspect-[2.5/3.5] w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
              {entry.card.image?.small && (
                <img
                  src={entry.card.image.small}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              {entry.isFoil && <FoilOverlay />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-semibold">{entry.card.name}</span>
                <ReviewStatusIcon
                  hasAlternatives={entry.hasAlternatives}
                  lowConfidenceMatch={entry.lowConfidenceMatch}
                  wasCorrected={entry.corrected}
                  isReviewed={entry.reviewed}
                />
              </span>
              <span className="block truncate text-xs font-normal text-foreground/70">
                {[
                  onOpenLocation
                    ? entry.locationName
                    : t("cards.position", { position: entry.position }),
                  entry.card.setName,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            {price != null && (
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {format(price)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
