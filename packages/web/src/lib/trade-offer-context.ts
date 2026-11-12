import type { TradeOfferContextValue } from "@/lib/interfaces/trade-offers";
import { createContext, useContext } from "react";

export const TradeOfferContext = createContext<TradeOfferContextValue | null>(null);

export function useTradeOfferContext(): TradeOfferContextValue | null {
  return useContext(TradeOfferContext);
}
