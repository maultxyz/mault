import type { QueryKey } from "@tanstack/react-query";

export interface PendingCardRemoval {
  commit: () => Promise<void>;
}

export interface DeferredCardRemovalRequest {
  collectionGuid: string;
  scanIds: string[];
}

export type CardCacheSnapshot = Array<[QueryKey, unknown]>;
