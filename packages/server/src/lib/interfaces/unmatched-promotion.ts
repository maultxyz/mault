import type { PlayingCardWithDistance, ScannedCard } from "@magic-vault/shared";

export type UnmatchedPromotionOrigin = "identifiedByHand" | "retriedAutomatically";

export interface UnmatchedPromotionRequest {
  orgId: string;
  collectionGuid: string;
  scanId: string;
  card: PlayingCardWithDistance;
  isFoil?: boolean;
  foilType?: string | null;
  origin: UnmatchedPromotionOrigin;
}

export interface PromotedUnmatchedScan {
  orgId: string;
  collectionGuid: string;
  scanId: string;
  origin: UnmatchedPromotionOrigin;
  identified: PlayingCardWithDistance;
  card: ScannedCard;
  collection: {
    id: number;
    gameId: number | null;
    name: string;
    lang: string;
    gameKey: string | null;
    gameName: string | null;
  };
  image: {
    capturedImageKey: string | null;
    capturedImageDataUrl: string | null;
  };
}

export type UnmatchedPromotionOutcome =
  | { status: 200; promoted: PromotedUnmatchedScan }
  | { status: 402; message: string; scanLimitReached: true }
  | { status: 404; message: string };

export interface UnmatchedRetryMatch {
  scanId: string;
  card: PlayingCardWithDistance;
}

export interface UnmatchedRetryBatchRequest {
  jwtClaims: string;
  orgId: string;
  collectionGuid: string;
  scanIds: string[];
}
