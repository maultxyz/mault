import type { InPersonTradeRequest } from "@magic-vault/shared";
import type { TradeOfferResponse } from "./trade-offers";

export interface InPersonTradeCollection {
  id: number;
  guid: string | null;
  lang: string;
  gameKey: string;
}

export interface RecordInPersonTradeInput {
  orgId: string;
  userId: string;
  request: InPersonTradeRequest;
}

export type RecordInPersonTradeResult =
  | {
      status: "recorded";
      guid: string;
      removal: TradeOfferResponse;
      receiveCollectionGuid: string | null;
      addedCount: number;
    }
  | { status: "collection-not-found" }
  | { status: "given-not-found" }
  | { status: "received-not-found" };
