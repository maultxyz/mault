import { useSyncExternalStore } from "react";
import { readTradeDraft, subscribeToTradeDraft } from "@/features/trade-offers/lib/trade-draft";
import type { TradeDraft } from "@/lib/interfaces/trade";

export function useTradeDraft(): TradeDraft {
  return useSyncExternalStore(subscribeToTradeDraft, readTradeDraft);
}
