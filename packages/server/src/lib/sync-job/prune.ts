import { SYNC_PRUNE_LOGGED_REASON_LIMIT } from "../constants/sync";
import type { SyncPruneInput, SyncPrunePlan } from "../interfaces/sync-job";

function describeReasons(reasons: readonly string[]): string {
  const shown = reasons.slice(0, SYNC_PRUNE_LOGGED_REASON_LIMIT).join("; ");
  const hiddenCount = reasons.length - SYNC_PRUNE_LOGGED_REASON_LIMIT;
  return hiddenCount > 0 ? `${shown}; and ${hiddenCount} more` : shown;
}

export function planSyncPrune({
  storedCardIds,
  fetchedCardIds,
  incompleteFetchReasons,
  maxShareOfStoredCards,
}: SyncPruneInput): SyncPrunePlan {
  const cardIdsToDelete = storedCardIds.filter((cardId) => !fetchedCardIds.has(cardId));
  if (cardIdsToDelete.length === 0) return { kind: "prune", cardIdsToDelete };
  if (incompleteFetchReasons.length > 0) {
    return {
      kind: "skip",
      reason: `the source fetch was incomplete (${describeReasons(incompleteFetchReasons)})`,
      staleCardCount: cardIdsToDelete.length,
    };
  }
  if (fetchedCardIds.size === 0) {
    return {
      kind: "skip",
      reason: "the source returned no cards",
      staleCardCount: cardIdsToDelete.length,
    };
  }
  const maxCardsToDelete = Math.floor(storedCardIds.length * maxShareOfStoredCards);
  if (cardIdsToDelete.length > maxCardsToDelete) {
    return {
      kind: "skip",
      reason: `that is more than ${Math.round(maxShareOfStoredCards * 100)}% of the ${storedCardIds.length} stored cards`,
      staleCardCount: cardIdsToDelete.length,
    };
  }
  return { kind: "prune", cardIdsToDelete };
}
