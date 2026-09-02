import { authQuery } from "../../db";
import { fabAdapter } from "../fab/search";
import { gundamAdapter } from "../gundam/search";
import { lorcanaAdapter } from "../lorcana/search";
import { onePieceAdapter } from "../onepiece/search";
import { pokemonAdapter } from "../pokemon/search";
import { scryfallAdapter } from "../scryfall/search";
import { yugiohAdapter } from "../yugioh/search";
import { withCache } from "./cache";
import { withErrorHandling } from "./error-handling";
import type { CardSearchAdapter } from "./types";

export const ADAPTERS_BY_GAME_KEY: Record<string, CardSearchAdapter> = {
  mtg: withCache(withErrorHandling(scryfallAdapter)),
  gundam: withCache(withErrorHandling(gundamAdapter)),
  pokemon: withCache(withErrorHandling(pokemonAdapter)),
  lorcana: withCache(withErrorHandling(lorcanaAdapter)),
  onepiece: withCache(withErrorHandling(onePieceAdapter)),
  fab: withCache(withErrorHandling(fabAdapter)),
  yugioh: withCache(withErrorHandling(yugiohAdapter)),
};

export async function resolveGameKeyAndLang(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<{ gameKey: string; lang: string } | null> {
  if (!collectionGuid) return null;
  return authQuery(jwtClaims, async (tx) => {
    const collection = await tx.query.collections.findFirst({
      where: (t, { eq }) => eq(t.guid, collectionGuid),
      columns: { gameId: true, lang: true },
    });
    if (!collection?.gameId) return null;
    const game = await tx.query.games.findFirst({
      where: (t, { eq }) => eq(t.id, collection.gameId!),
      columns: { key: true },
    });
    if (!game) return null;
    return { gameKey: game.key, lang: collection.lang };
  });
}

export async function resolveCardSearch(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<{ adapter: CardSearchAdapter; baseUrl: string; lang: string } | null> {
  const resolved = await resolveGameKeyAndLang(jwtClaims, collectionGuid);
  if (!resolved) return null;

  const adapter = ADAPTERS_BY_GAME_KEY[resolved.gameKey];
  if (!adapter) return null;

  const baseUrl = adapter.urlForLang?.(resolved.lang) ?? adapter.defaultUrl;
  return { adapter, baseUrl, lang: resolved.lang };
}
