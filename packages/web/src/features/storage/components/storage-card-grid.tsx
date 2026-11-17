import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { CARD_GRID_DENSITY_CLASS } from "@/lib/constants/card-grid";
import type { StorageCardGridProps } from "@/lib/interfaces/storage";

export function StorageCardGrid({
  entries,
  density,
  onOpenCard,
}: StorageCardGridProps) {
  return (
    <div className="@container">
      <div className={CARD_GRID_DENSITY_CLASS[density]}>
        {entries.map((entry) => (
          <ScannedCardItem
            key={entry.scanId}
            card={entry.card}
            onOpen={() => onOpenCard(entry)}
            hasAlternatives={entry.hasAlternatives}
            lowConfidenceMatch={entry.lowConfidenceMatch}
            wasCorrected={entry.corrected}
            isReviewed={entry.reviewed}
            isFoil={entry.isFoil}
            foilType={entry.foilType ?? undefined}
            condition={entry.condition}
            storageLocation={{
              guid: entry.locationGuid,
              name: entry.locationName,
              position: entry.position,
            }}
          />
        ))}
      </div>
    </div>
  );
}
