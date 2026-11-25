import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import { RarityGameKeyContext } from "@/lib/rarity-game-key-context";
import { useContext } from "react";

export function useRarityGameKey(): string | null {
  const gameKey = useContext(RarityGameKeyContext);
  const detailScope = useContext(CardDetailScopeContext);
  return gameKey ?? detailScope?.collection?.game?.key ?? null;
}
