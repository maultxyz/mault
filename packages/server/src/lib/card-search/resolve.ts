import { and, eq } from "drizzle-orm";
import { authQuery } from "../../db";
import { collections, games } from "../../db/schema";
import { fabAdapter } from "../adapters/fab/search";
import { grandArchiveAdapter } from "../adapters/grand-archive/search";
import { gundamAdapter } from "../adapters/gundam/search";
import { lorcanaAdapter } from "../adapters/lorcana/search";
import { onePieceAdapter } from "../adapters/onepiece/search";
import { pokemonAdapter } from "../adapters/pokemon/search";
import { riftboundAdapter } from "../adapters/riftbound/search";
import { swuAdapter } from "../adapters/swu/search";
import { scryfallAdapter } from "../adapters/scryfall/search";
import { yugiohAdapter } from "../adapters/yugioh/search";
import { withCache } from "./cache";
import { withErrorHandling } from "./error-handling";
import type {
  CardSearchAdapter,
  ResolvedCardSearch,
} from "../interfaces/card-search";

export const ADAPTERS_BY_GAME_KEY: Record<string, CardSearchAdapter> = {
  mtg: withCache(withErrorHandling(scryfallAdapter)),
  gundam: withCache(withErrorHandling(gundamAdapter)),
  pokemon: withCache(withErrorHandling(pokemonAdapter)),
  lorcana: withCache(withErrorHandling(lorcanaAdapter)),
  onepiece: withCache(withErrorHandling(onePieceAdapter)),
  fab: withCache(withErrorHandling(fabAdapter)),
  yugioh: withCache(withErrorHandling(yugiohAdapter)),
  riftbound: withCache(withErrorHandling(riftboundAdapter)),
  swu: withCache(withErrorHandling(swuAdapter)),
  grandarchive: withCache(withErrorHandling(grandArchiveAdapter)),
};

export async function resolveGameKeyAndLang(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<{ gameKey: string; lang: string } | null> {
  if (!collectionGuid) return null;
  return authQuery(jwtClaims, async (tx) => {
    const [row] = await tx
      .select({ gameKey: games.key, lang: collections.lang })
      .from(collections)
      .innerJoin(games, eq(games.id, collections.gameId))
      .where(
        and(
          eq(collections.guid, collectionGuid),
          eq(collections.isDeleted, false),
        ),
      )
      .limit(1);
    return row ?? null;
  });
}

export function resolveCardSearchForGame(
  gameKey: string,
  lang: string,
): ResolvedCardSearch | null {
  const adapter = ADAPTERS_BY_GAME_KEY[gameKey];
  if (!adapter) return null;

  const baseUrl = adapter.urlForLang?.(lang) ?? adapter.defaultUrl;
  return { adapter, gameKey, baseUrl, lang };
}

export async function resolveCardSearch(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<ResolvedCardSearch | null> {
  const resolved = await resolveGameKeyAndLang(jwtClaims, collectionGuid);
  if (!resolved) return null;
  return resolveCardSearchForGame(resolved.gameKey, resolved.lang);
}
