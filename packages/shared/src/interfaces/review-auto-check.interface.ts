import type { SearchCardMatch } from "./api.interface";

export type ReviewAutoCheckVerdict = "confirmed" | "different" | "unsure";

export interface ReviewAutoCheckSavedCard {
  cardId: string;
  lang: string | null;
}

export interface ReviewAutoCheckDecision {
  verdict: ReviewAutoCheckVerdict;
  suggestion: SearchCardMatch | null;
}

export interface ReviewAutoCheckOutcome {
  scanId: string;
  verdict: ReviewAutoCheckVerdict;
  suggestedCardName: string | null;
}

export interface ReviewAutoCheckResult {
  outcomes: ReviewAutoCheckOutcome[];
}

export interface ReviewAutoCheckCounts {
  confirmed: number;
  different: number;
  unsure: number;
}

export interface ReviewAutoCheckRunOptions {
  cards: { scanId: string; collectionGuid: string }[];
  checkCollectionCards: (
    collectionGuid: string,
    scanIds: string[],
  ) => Promise<ReviewAutoCheckResult>;
  onOutcomes: (outcomes: ReviewAutoCheckOutcome[]) => void;
  isCancelled?: () => boolean;
}
