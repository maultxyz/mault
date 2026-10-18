import { useViewedCollection } from "@/features/collections/api/use-viewed-collection";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import type {
  CardDetailActions,
  CardDetailScope,
} from "@/lib/interfaces/cards";
import type { Collection } from "@magic-vault/shared";
import { createContext, useContext } from "react";

export const CardDetailScopeContext = createContext<CardDetailScope | null>(
  null,
);

export function useCardDetailCollection(): Collection | null {
  const scope = useContext(CardDetailScopeContext);
  const { collection } = useViewedCollection();
  return scope ? scope.collection : collection;
}

export function useCardDetailActions(): CardDetailActions {
  const scope = useContext(CardDetailScopeContext);
  const {
    correctCard,
    confirmCard,
    markCardReviewed,
    setCardFoilType,
    setCardCondition,
  } = useScannedCards();
  return (
    scope?.actions ?? {
      correctCard,
      confirmCard,
      markCardReviewed,
      setCardFoilType,
      setCardCondition,
    }
  );
}
