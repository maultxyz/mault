import { pendingScanCardsStore } from "@/features/cards/lib/pending-scan-cards-store";
import { useMemo, useSyncExternalStore } from "react";

export function usePendingScanCards(
  collectionGuid: string | undefined,
  cardListUpdatedAt: number,
) {
  const pendingScanCards = useSyncExternalStore(
    pendingScanCardsStore.subscribe,
    pendingScanCardsStore.getSnapshot,
  );
  return useMemo(
    () =>
      pendingScanCards.filter(
        (pendingScanCard) =>
          pendingScanCard.collectionGuid === collectionGuid &&
          (pendingScanCard.savedAt == null ||
            pendingScanCard.savedAt >= cardListUpdatedAt),
      ),
    [pendingScanCards, collectionGuid, cardListUpdatedAt],
  );
}
