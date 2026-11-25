import type {
  PlayingCard,
  ReviewAutoCheckDecision,
} from "@magic-vault/shared";

export interface ReviewAutoCheckRequestContext {
  jwtClaims: string;
  orgId: string;
  collectionGuid: string;
  scanIds: string[];
}

export interface ReviewAutoCheckRow {
  scanId: string;
  cardId: string;
  cardLang: string | null;
  card: PlayingCard;
  alternativeMatches: PlayingCard[] | null;
  gameKey: string | null;
  lang: string;
  matchAllLanguages: boolean;
  capturedImageKey: string | null;
  capturedImageDataUrl: string | null;
}

export interface CheckedReviewAutoCheckRow {
  row: ReviewAutoCheckRow;
  decision: ReviewAutoCheckDecision;
}
