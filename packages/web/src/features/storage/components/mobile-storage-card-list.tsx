import { CardThumbnail } from "@/components/card-thumbnail";
import { Checkbox } from "@/components/ui/checkbox";
import { ReviewStatusIcon } from "@/features/cards/components/review-status-icon";
import { usePriceSource } from "@/hooks/use-price-source";
import { MOBILE_LIST_CLASS, MOBILE_LIST_ROW_CLASS } from "@/lib/constants/nav";
import type { StorageCardListProps } from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function MobileStorageCardList({
  entries,
  onOpenLocation,
  onOpenCard,
  isSelected,
  onToggleSelect,
}: StorageCardListProps) {
  const { t } = useTranslation("storage");
  const { t: tCards } = useTranslation("cards");
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
          <div
            key={`${entry.locationGuid}-${entry.scanId}`}
            className="flex items-center gap-3"
          >
            {onToggleSelect && (
              <Checkbox
                aria-label={tCards("scannedCardTable.selectRow", {
                  name: entry.card.name,
                })}
                checked={!!isSelected?.(entry)}
                onCheckedChange={() =>
                  onToggleSelect(entry, { shiftKey: false })
                }
              />
            )}
            <button
              type="button"
              onClick={() => onOpenCard(entry)}
              className={cn(MOBILE_LIST_ROW_CLASS, "min-w-0 flex-1")}
            >
              <CardThumbnail
                image={entry.card.image}
                className="w-10 rounded-sm"
              />
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
          </div>
        );
      })}
    </div>
  );
}
