import { fabDebugCards } from "./fab";
import { gundamDebugCards } from "./gundam";
import { lorcanaDebugCards } from "./lorcana";
import { mtgDebugCards } from "./mtg";
import { onePieceDebugCards } from "./onepiece";
import { pokemonDebugCards } from "./pokemon";
import type { DebugCardSet } from "@/lib/interfaces/scanner";


const DEBUG_CARDS_BY_GAME_KEY: Record<string, DebugCardSet> = {
  gundam: gundamDebugCards,
  pokemon: pokemonDebugCards,
  lorcana: lorcanaDebugCards,
  onepiece: onePieceDebugCards,
  fab: fabDebugCards,
};

export function getDebugCards(gameKey: string | undefined): DebugCardSet {
  return (gameKey && DEBUG_CARDS_BY_GAME_KEY[gameKey]) || mtgDebugCards;
}
