import { pendingScanCardsStore } from "@/features/cards/lib/pending-scan-cards-store";
import type { PiScanPendingSave } from "@magic-vault/shared";

export function createPiScanPendingSaveObserver(
  orgId: string | null,
  onSaved: (collectionGuid: string) => void,
) {
  let current: PiScanPendingSave | null = null;
  let latestUpdatedAt = 0;
  const clear = () => {
    if (current) pendingScanCardsStore.remove(current.scanId);
    current = null;
  };
  return {
    clear,
    apply(next: PiScanPendingSave | null | undefined) {
      if (!orgId || !next) {
        clear();
        return;
      }
      if (next.orgId !== orgId || next.updatedAt < latestUpdatedAt) return;
      latestUpdatedAt = next.updatedAt;
      if (current?.scanId !== next.scanId) clear();
      if (next.status === "failed") {
        clear();
        return;
      }
      if (current?.scanId === next.scanId && current.status === next.status)
        return;
      if (!current) {
        pendingScanCardsStore.add({
          scanId: next.scanId,
          collectionGuid: next.collectionGuid,
          card: {
            ...next.card,
            image: null,
            setName: "",
            rarity: "",
            typeLine: "",
            colorIdentity: [],
            price: null,
            priceFoil: null,
            distance: 0,
          },
        });
      }
      current = next;
      if (next.status === "saved") {
        pendingScanCardsStore.markSaved(next.scanId);
        onSaved(next.collectionGuid);
      }
    },
  };
}
