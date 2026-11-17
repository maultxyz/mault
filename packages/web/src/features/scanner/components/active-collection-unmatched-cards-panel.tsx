import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";

export function ActiveCollectionUnmatchedCardsPanel() {
  const {
    unmatchedCards,
    unmatchedCount,
    removeUnmatchedCard,
    removeAllUnmatchedCards,
  } = useScannedCards();
  const { activeCollection } = useCollections();
  return (
    <UnmatchedCardsPanel
      canIdentify
      cards={unmatchedCards}
      total={unmatchedCount}
      collectionGuid={activeCollection?.guid}
      onRemove={removeUnmatchedCard}
      onRemoveAll={removeAllUnmatchedCards}
    />
  );
}
