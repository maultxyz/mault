import { useCollections } from "@/features/collections/api/use-collections";
import { IdentifyUnmatchedDialog } from "@/features/scanner/components/identify-unmatched-dialog";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import type { IdentifiableUnmatchedCardsPanelProps } from "@/lib/interfaces/scanner";
import type { UnmatchedCard } from "@magic-vault/shared";
import { useState } from "react";

export function IdentifiableUnmatchedCardsPanel({
  cards,
  onRemove,
}: IdentifiableUnmatchedCardsPanelProps) {
  const { activeCollection } = useCollections();
  const [identifying, setIdentifying] = useState<UnmatchedCard | null>(null);

  return (
    <>
      <UnmatchedCardsPanel
        cards={cards}
        onRemove={onRemove}
        onIdentify={setIdentifying}
      />
      <IdentifyUnmatchedDialog
        entry={identifying}
        collectionGuid={activeCollection?.guid}
        onClose={() => setIdentifying(null)}
      />
    </>
  );
}
