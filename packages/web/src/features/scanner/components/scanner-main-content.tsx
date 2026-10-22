import { CardGrid } from "@/features/cards/components/card-grid";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useUnmatchedView } from "@/features/scanner/api/use-unmatched-view";
import { UnmatchedCardsBrowser } from "@/features/scanner/components/unmatched-cards-browser";

export function ScannerMainContent() {
  const { isOpen, openIndex, setOpenIndex, close } = useUnmatchedView();
  const { activeCollection } = useCollections();
  const { removeUnmatchedCard } = useScannedCards();

  if (isOpen && activeCollection) {
    return (
      <UnmatchedCardsBrowser
        collectionGuid={activeCollection.guid}
        openIndex={openIndex}
        onOpenIndexChange={setOpenIndex}
        canIdentify
        onRemove={removeUnmatchedCard}
        onClose={close}
      />
    );
  }
  return <CardGrid />;
}
