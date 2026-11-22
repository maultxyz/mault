import type { CardReservationsContextValue } from "@/lib/interfaces/card-reservations";
import { createContext, useContext } from "react";

export const CardReservationsContext = createContext<CardReservationsContextValue | null>(null);

export function useCardReservationsContext(): CardReservationsContextValue | null {
  return useContext(CardReservationsContext);
}
