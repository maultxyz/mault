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
