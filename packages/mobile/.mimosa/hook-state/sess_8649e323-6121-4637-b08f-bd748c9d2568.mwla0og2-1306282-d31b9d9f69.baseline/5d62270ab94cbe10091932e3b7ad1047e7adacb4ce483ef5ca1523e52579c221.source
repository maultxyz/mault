import type { QueryKey } from "@tanstack/react-query";
import type { CardCondition, CardStorageLocation } from "@magic-vault/shared";

export interface PendingCardRemoval {
  commit: () => Promise<void>;
}

export interface DeferredCardRemovalRequest {
  collectionGuid: string;
  scanIds: string[];
}

export type CardCacheSnapshot = Array<[QueryKey, unknown]>;

export interface CardCachePatch {
  isFoil?: boolean;
  foilType?: string | null;
  stamp?: string | null;
  condition?: CardCondition;
  language?: string;
  reviewed?: boolean;
  corrected?: boolean;
  lowConfidenceMatch?: boolean;
  storageLocation?: CardStorageLocation | null;
}

export interface CardCachePatchContext {
  snapshot: CardCacheSnapshot;
}

export type CardReviewKind = "confirm" | "review";
