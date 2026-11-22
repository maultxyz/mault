import type { PlayingCard, PlayingCardWithDistance } from "./card.interface";
import type { CardAcquisitionCost } from "./business.interface";
import type {
  CardScanOrigin,
  MatchedScanDiagnostics,
  ScannedCard,
  UnmatchedCard,
} from "./scanner.interface";
import type { CardStorageLocation } from "./storage-locations.interface";

export interface CardFilters {
  colors: string[];
  rarities: string[];
  bins: Array<number | null>;
  needsAttention: boolean;
  hideDownloaded: boolean;
  sets: string[];
  minMatchPercent: number;
  foilTypes: string[];
}

export interface CollectionCardsQuery {
  search: string;
  sort: string | null;
  filters: CardFilters;
  grouped: boolean;
  unreviewed?: boolean;
}

export interface GroupedScannedCard extends ScannedCard {
  scanIds: string[];
  quantity: number;
  storedCount?: number;
}

export type CardReviewStatus = "reviewed" | "needsAttention";

export interface CardReviewStatusInput {
  hasAlternatives?: boolean;
  lowConfidenceMatch?: boolean;
  wasCorrected?: boolean;
  isReviewed?: boolean;
}

export interface InlineUnmatchedCard extends UnmatchedCard {
  position: number;
}

export interface InlineUnmatchedCards {
  items: InlineUnmatchedCard[];
  totalInPage: number;
}

export interface CollectionCardsPage {
  items: GroupedScannedCard[];
  page: number;
  pageSize: number;
  totalEntries: number;
  totalCards: number;
  unmatched?: InlineUnmatchedCards;
}

export type CardGridTile<Card extends ScannedCard = GroupedScannedCard> =
  | { kind: "card"; entry: Card }
  | { kind: "unmatched"; entry: InlineUnmatchedCard }
  | { kind: "moreUnmatched"; hiddenCount: number; position: number };

export interface CollectionCardPosition {
  entry: ScannedCard;
  index: number;
  total: number;
  prevScanId: string | null;
  nextScanId: string | null;
  copyIndex: number;
  copyCount: number;
}

export interface CardStatsAggregate {
  totalCount: number;
  uniqueCount: number;
  totalValue: number;
  priceableCount: number;
  mostValuable: { name: string; price: number } | null;
  sets: { code: string; name: string; count: number; value: number }[];
  rarities: { key: string; count: number }[];
  colors: { key: string; count: number }[];
  foilTypes: { key: string; count: number }[];
}

export interface CollectionCardsSummary {
  all: CardStatsAggregate;
  filtered: CardStatsAggregate;
  isRefreshing?: boolean;
}

export interface CollectionCardsCount {
  totalCount: number;
}

export interface BinWindow {
  binNumber: number;
  lastEmptiedAt: number | null;
}

export interface BinCardCount {
  binNumber: number;
  count: number;
}

export interface BinContentCard {
  scanId: string;
  binNumber: number;
  scannedAt: number;
  card: PlayingCardWithDistance;
  isFoil?: boolean;
  foilType?: string;
  stamp?: string;
}

export interface IdentifyUnmatchedCardRequest {
  card: PlayingCard;
  isFoil?: boolean;
  foilType?: string | null;
}

export interface RetryUnmatchedCardsRequest {
  scanIds: string[];
}

export interface RetryUnmatchedCardsBatchResult {
  checkedCount: number;
  matchedCount: number;
  scanLimitReached: boolean;
}

export interface AddManualCardRequest {
  card: PlayingCard;
  locationGuid?: string;
}

export type CardSortDirection = "asc" | "desc";

export interface CollectionCardScanImageUrls {
  capturedImageUrl?: string;
  capturedBackImageUrl?: string;
}

export interface CollectionCardDetails {
  images: CollectionCardScanImageUrls;
  diagnostics: MatchedScanDiagnostics | null;
  origin: CardScanOrigin | null;
  location: CardStorageLocation | null;
  cost: CardAcquisitionCost | null;
}

export interface UnmatchedRetryProgress {
  checkedCount: number;
  matchedCount: number;
  totalCount: number;
}

export interface UnmatchedRetrySummary extends UnmatchedRetryProgress {
  scanLimitReached: boolean;
  wasStopped: boolean;
}

export interface UnmatchedRetryRunOptions {
  scanIds: readonly string[];
  retryBatch: (scanIds: string[]) => Promise<RetryUnmatchedCardsBatchResult>;
  onProgress?: (progress: UnmatchedRetryProgress) => void;
  shouldStop?: () => boolean;
}

export interface UnmatchedBulkRemoveOptions {
  scanIds: readonly string[];
  removeScan: (scanId: string) => Promise<boolean>;
}

export interface UnmatchedBulkRemoveSummary {
  removedCount: number;
  failedCount: number;
}
