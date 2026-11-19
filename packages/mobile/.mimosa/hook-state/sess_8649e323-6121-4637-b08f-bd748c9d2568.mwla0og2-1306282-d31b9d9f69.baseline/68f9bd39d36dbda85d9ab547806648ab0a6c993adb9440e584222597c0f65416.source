import type { Result, ReviewAcceptResult } from "@magic-vault/shared";
import { addUserInteractionListener } from "expo-widgets";
import { invalidateCollectionCards } from "@/features/collections/api/collection-cards";
import { cardReviewWidget } from "@/features/widgets/components/card-review-widget";
import { apiPost, unwrap } from "@/lib/api/client";
import { CARD_REVIEW_WIDGET_NAME, WIDGET_SUMMARY_QUERY_KEY } from "@/lib/constants/widgets";
import type { CardReviewWidgetSyncOptions, PendingReviewAccept } from "@/lib/interfaces/widgets";

const pendingReviewAccepts = new Map<string, PendingReviewAccept>();
let lastCardReviewSnapshot = "";
let syncQueue: Promise<void> = Promise.resolve();

async function collectAcceptsMadeInWidget(): Promise<boolean> {
  const timeline = await cardReviewWidget.getTimeline();
  let foundAccepts = false;
  for (const entry of timeline) {
    const collectionGuidByScanId = new Map((entry.props.cards ?? []).map((card) => [card.scanId, card.collectionGuid]));
    for (const scanId of entry.props.acceptedScanIds ?? []) {
      foundAccepts = true;
      const collectionGuid = collectionGuidByScanId.get(scanId);
      if (collectionGuid && !pendingReviewAccepts.has(scanId)) {
        pendingReviewAccepts.set(scanId, { collectionGuid, sentAt: null });
      }
    }
  }
  return foundAccepts;
}

function pendingAcceptedScanIds(summaryUpdatedAt: number): Set<string> {
  for (const [scanId, accept] of pendingReviewAccepts) {
    if (accept.sentAt !== null && accept.sentAt < summaryUpdatedAt) pendingReviewAccepts.delete(scanId);
  }
  return new Set(pendingReviewAccepts.keys());
}

async function sendPendingAccepts({ queryClient }: Pick<CardReviewWidgetSyncOptions, "queryClient">): Promise<void> {
  const unsentScanIdsByCollection = new Map<string, string[]>();
  for (const [scanId, accept] of pendingReviewAccepts) {
    if (accept.sentAt !== null) continue;
    unsentScanIdsByCollection.set(accept.collectionGuid, [
      ...(unsentScanIdsByCollection.get(accept.collectionGuid) ?? []),
      scanId,
    ]);
  }
  if (unsentScanIdsByCollection.size === 0) return;
  let sentAny = false;
  await Promise.all(
    [...unsentScanIdsByCollection].map(async ([collectionGuid, scanIds]) => {
      try {
        await unwrap(
          apiPost<Result<ReviewAcceptResult>>(`/api/collections/${collectionGuid}/cards/accept-review`, {
            confirmScanIds: scanIds,
            reviewScanIds: [],
          }),
        );
      } catch {
        return;
      }
      const sentAt = Date.now();
      for (const scanId of scanIds) pendingReviewAccepts.set(scanId, { collectionGuid, sentAt });
      invalidateCollectionCards(queryClient, collectionGuid);
      sentAny = true;
    }),
  );
  if (sentAny) await queryClient.invalidateQueries({ queryKey: [WIDGET_SUMMARY_QUERY_KEY] });
}

async function runCardReviewWidgetSync(options: CardReviewWidgetSyncOptions): Promise<void> {
  const widgetChangedLocally = await collectAcceptsMadeInWidget();
  const props = options.buildProps(pendingAcceptedScanIds(options.summaryUpdatedAt));
  const snapshot = JSON.stringify(props);
  if (widgetChangedLocally || snapshot !== lastCardReviewSnapshot) {
    lastCardReviewSnapshot = snapshot;
    cardReviewWidget.updateSnapshot(props);
  }
  await sendPendingAccepts(options);
}

export function syncCardReviewWidget(options: CardReviewWidgetSyncOptions): Promise<void> {
  syncQueue = syncQueue.then(() => runCardReviewWidgetSync(options)).catch(() => undefined);
  return syncQueue;
}

export function subscribeToCardReviewWidgetPresses(onPress: () => void): () => void {
  const subscription = addUserInteractionListener((event) => {
    if (event.source === CARD_REVIEW_WIDGET_NAME) onPress();
  });
  return () => subscription.remove();
}
