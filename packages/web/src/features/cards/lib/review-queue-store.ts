import type { CollectionCardsQuery } from "@magic-vault/shared";
import type { ReviewQueueSession } from "@/lib/interfaces/cards";

let session: ReviewQueueSession | null = null;
let nextSessionId = 1;
const listeners = new Set<() => void>();

function publish(nextSession: ReviewQueueSession | null) {
  session = nextSession;
  for (const listener of listeners) listener();
}

function withScanId(scanIds: ReadonlySet<string>, scanId: string) {
  const next = new Set(scanIds);
  next.add(scanId);
  return next;
}

export const reviewQueueStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => session,
  start(collectionGuid: string, query: CollectionCardsQuery) {
    publish({
      id: nextSessionId++,
      collectionGuid,
      query,
      currentScanId: null,
      reviewedScanIds: new Set(),
      removedScanIds: new Set(),
    });
  },
  stop() {
    if (session) publish(null);
  },
  setCurrent(scanId: string | null) {
    if (session && session.currentScanId !== scanId) {
      publish({ ...session, currentScanId: scanId });
    }
  },
  markReviewed(scanId: string) {
    if (!session || session.reviewedScanIds.has(scanId)) return;
    publish({
      ...session,
      reviewedScanIds: withScanId(session.reviewedScanIds, scanId),
    });
  },
  markRemoved(scanId: string) {
    if (!session || session.removedScanIds.has(scanId)) return;
    publish({
      ...session,
      removedScanIds: withScanId(session.removedScanIds, scanId),
    });
  },
};
