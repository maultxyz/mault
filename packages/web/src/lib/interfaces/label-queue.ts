import type { Result } from "@magic-vault/shared";

export type LabelQueueSkipped = "skipped";

export interface LabelQueueItem {
  scanId: string;
  capturedImageUrl: string | null;
}

export interface LabelQueueHistoryEntry<
  Item extends LabelQueueItem,
  Decision extends string,
> {
  item: Item;
  decision: Decision | LabelQueueSkipped;
}

export interface LabelQueueOptions<
  Item extends LabelQueueItem,
  Decision extends string,
> {
  items: Item[] | undefined;
  isFetchingQueue: boolean;
  queueFetchedAt: number;
  refetchQueue: () => unknown;
  saveLabel: (item: Item, decision: Decision) => Promise<Result<null>>;
  saveErrorMessage: string;
}
