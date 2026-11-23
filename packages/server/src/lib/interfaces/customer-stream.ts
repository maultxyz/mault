import type { SseWriter } from "./sse";

export type CustomerItemKind = "tradeOffers" | "cardReservations";

export interface CustomerStreamSubscriber {
  userId: string;
  orgIds: Set<string>;
  write: SseWriter;
}
