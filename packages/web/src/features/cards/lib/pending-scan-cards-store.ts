import { PENDING_SCAN_CARD_SAVED_RETENTION_MS } from "@/lib/constants/card-grid";
import type { PendingScanCard } from "@/lib/interfaces/cards";

let pendingScanCards: PendingScanCard[] = [];
const listeners = new Set<() => void>();

function publish(nextPendingScanCards: PendingScanCard[]) {
  pendingScanCards = nextPendingScanCards;
  for (const listener of listeners) listener();
}

function isExpiredSavedCard(pendingScanCard: PendingScanCard, now: number) {
  return (
    pendingScanCard.savedAt != null &&
    now - pendingScanCard.savedAt > PENDING_SCAN_CARD_SAVED_RETENTION_MS
  );
}

export const pendingScanCardsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => pendingScanCards,
  add(pendingScanCard: Omit<PendingScanCard, "status" | "savedAt">) {
    const now = Date.now();
    publish([
      { ...pendingScanCard, status: "saving" },
      ...pendingScanCards.filter(
        (existing) =>
          existing.scanId !== pendingScanCard.scanId &&
          !isExpiredSavedCard(existing, now),
      ),
    ]);
  },
  markSaved(scanId: string) {
    publish(
      pendingScanCards.map((pendingScanCard) =>
        pendingScanCard.scanId === scanId
          ? { ...pendingScanCard, status: "saved", savedAt: Date.now() }
          : pendingScanCard,
      ),
    );
  },
  remove(scanId: string) {
    publish(
      pendingScanCards.filter(
        (pendingScanCard) => pendingScanCard.scanId !== scanId,
      ),
    );
  },
};
