import type { CardHoldsContextValue } from "@/lib/interfaces/card-holds";
import { createContext, useContext } from "react";

export const CardHoldsContext = createContext<CardHoldsContextValue | null>(null);

export function useCardHoldsContext(): CardHoldsContextValue | null {
  return useContext(CardHoldsContext);
}
