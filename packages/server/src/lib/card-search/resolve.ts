import { isCardLanguage } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { authQuery } from "../../db";
import { collections, games } from "../../db/schema";
import { cyberpunkAdapter } from "../adapters/cyberpunk/search";
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
import { withTcgtracking } from "../tcgtracking/adapter";
import type {
  CardSearchAdapter,
  CollectionMatchScope,
  ResolvedCardSearch,
} from "../interfaces/card-search";

export const ADAPTERS_BY_GAME_KEY: Record<string, CardSearchAdapter> = {
  mtg: withCache(
    withErrorHandling(withTcgtracking("mtg", scryfallAdapter)),
  ),
  gundam: withCache(
    withErrorHandling(withTcgtracking("gundam", gundamAdapter)),
  ),
  pokemon: withCache(
    withErrorHandling(withTcgtracking("pokemon", pokemonAdapter)),
  ),
  lorcana: withCache(
    withErrorHandling(withTcgtracking("lorcana", lorcanaAdapter)),
  ),
  onepiece: withCache(
    withErrorHandling(withTcgtracking("onepiece", onePieceAdapter)),
  ),
  fab: withCache(
    withErrorHandling(withTcgtracking("fab", fabAdapter)),
  ),
  yugioh: withCache(
    withErrorHandling(withTcgtracking("yugioh", yugiohAdapter)),
  ),
  riftbound: withCache(
    withErrorHandling(withTcgtracking("riftbound", riftboundAdapter)),
  ),
  swu: withCache(
    withErrorHandling(withTcgtracking("swu", swuAdapter)),
  ),
  grandarchive: withCache(
    withErrorHandling(withTcgtracking("grandarchive", grandArchiveAdapter)),
  ),
  cyberpunk: withCache(
    withErrorHandling(withTcgtracking("cyberpunk", cyberpunkAdapter)),
  ),
};

export async function resolveGameKeyAndLang(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<CollectionMatchScope | null> {
  if (!collectionGuid) return null;
  return authQuery(jwtClaims, async (tx) => {
    const [row] = await tx
      .select({
        gameKey: games.key,
        lang: collections.lang,
        matchAllLanguages: collections.matchAllLanguages,
      })
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

export async function resolveManualCardSearch(
  jwtClaims: string,
  collectionGuid: string | undefined,
  requestedLanguage: string | undefined,
): Promise<ResolvedCardSearch | null> {
  const resolved = await resolveCardSearch(jwtClaims, collectionGuid);
  if (!resolved) return null;
  const onlyLanguage = isCardLanguage(requestedLanguage)
    ? requestedLanguage
    : undefined;
  return { ...resolved, searchAllLanguages: true, onlyLanguage };
}

export async function resolveCardSearch(
  jwtClaims: string,
  collectionGuid: string | undefined,
): Promise<ResolvedCardSearch | null> {
  const resolved = await resolveGameKeyAndLang(jwtClaims, collectionGuid);
  if (!resolved) return null;
  return resolveCardSearchForGame(resolved.gameKey, resolved.lang);
}
