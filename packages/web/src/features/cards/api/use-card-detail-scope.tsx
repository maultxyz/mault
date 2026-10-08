import { useCollections } from "@/features/collections/api/use-collections";
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
  const { activeCollection } = useCollections();
  return scope ? scope.collection : activeCollection;
}

export function useCardDetailActions(): CardDetailActions {
  const scope = useContext(CardDetailScopeContext);
  const { correctCard, confirmCard, setCardFoilType } = useScannedCards();
  return scope?.actions ?? { correctCard, confirmCard, setCardFoilType };
}
