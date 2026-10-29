import { CardGrid } from "@/features/cards/components/card-grid";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { ScanRemovalPanel } from "@/features/scanner/components/scan-removal-panel";
import { useUnmatchedView } from "@/features/scanner/api/use-unmatched-view";
import { UnmatchedCardsBrowser } from "@/features/scanner/components/unmatched-cards-browser";

export function ScannerMainContent() {
  const { isOpen, openIndex, setOpenIndex, close } = useUnmatchedView();
  const { activeCollection } = useCollections();
  const { removeUnmatchedCard, removeAllUnmatchedCards } = useScannedCards();
  const { isRemoveModeEnabled } = useScanRemoval();

  if (isRemoveModeEnabled) return <ScanRemovalPanel />;

  if (isOpen && activeCollection) {
    return (
      <UnmatchedCardsBrowser
        collectionGuid={activeCollection.guid}
        openIndex={openIndex}
        onOpenIndexChange={setOpenIndex}
        canIdentify
        onRemove={removeUnmatchedCard}
        onRemoveAll={removeAllUnmatchedCards}
        onClose={close}
      />
    );
  }
  return <CardGrid />;
}
