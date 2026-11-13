import type { CardReviewWidgetSyncOptions } from "@/lib/interfaces/widgets";

export function syncCardReviewWidget(_options: CardReviewWidgetSyncOptions): Promise<void> {
  return Promise.resolve();
}

export function subscribeToCardReviewWidgetPresses(_onPress: () => void): () => void {
  return () => undefined;
}
