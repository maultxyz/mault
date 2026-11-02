import type { PlayingCardWithDistance } from "./card.interface";

export type ReviewAcceptKind = "confirm" | "review";

export interface ReviewGridCard {
  scanId: string;
  collectionGuid: string;
  card: PlayingCardWithDistance;
  lowConfidenceMatch: boolean;
  hasAlternatives: boolean;
  corrected: boolean;
}

export interface ReviewAcceptResult {
  acceptedScanIds: string[];
}

export interface CollectionReviewAcceptRequest {
  collectionGuid: string;
  confirmScanIds: string[];
  reviewScanIds: string[];
}

export interface CardsReviewedEvent {
  confirmedScanIds: string[];
  reviewedScanIds: string[];
}
