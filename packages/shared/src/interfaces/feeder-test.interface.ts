export type FeederTestOutcome =
  | "completed"
  | "stopped"
  | "hopperEmpty"
  | "feedFailed"
  | "routeFailed";

export interface FeederTestResult {
  outcome: FeederTestOutcome;
  cardsSent: number;
  error: string | null;
}

export interface FeederTestRunOptions {
  cardsToSend: number | null;
  currentFeedRetryCount: () => number;
  prepareNextCard?: () => Promise<void>;
  feedOnce: () => Promise<Record<string, unknown> | null>;
  routeCardToBottomBin: () => Promise<unknown>;
  isStopRequested: () => boolean;
  onCardSent: (cardsSent: number) => void;
}
