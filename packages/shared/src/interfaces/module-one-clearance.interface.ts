import type { SerialReply } from "./serial-session.interface";

export interface FeedNextCardAfterRoutedCardOptions<TFeedResult> {
  readSensors: () => Promise<SerialReply | null>;
  feedOnce: () => Promise<TFeedResult>;
  replyOf: (result: TFeedResult) => SerialReply | null;
  retryCount: number;
}

export type FeedNextCardAfterRoutedCardOutcome<TFeedResult> =
  | { kind: "stuckInModuleOne" }
  | { kind: "fed"; result: TFeedResult };
