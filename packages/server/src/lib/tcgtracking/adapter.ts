import { sql } from "drizzle-orm";
import type { CardSearchAdapter } from "../interfaces/card-search";
import {
  loadTcgtrackingCatalog,
  tcgtrackingCardImage,
  tcgtrackingProductIdOf,
} from "./catalog";
import {
  isTcgtrackingFallbackData,
  normalizeTcgtrackingFallback,
} from "./fallback";
import { TCGTRACKING_GAMES } from "./games";

export function withTcgtracking(
  gameKey: string,
  adapter: CardSearchAdapter,
): CardSearchAdapter {
  const config = TCGTRACKING_GAMES[gameKey];
  const categoryId = adapter.tcgplayer?.categoryId;
  if (!config || !categoryId) return adapter;
  const superseded = sql`(data->>'supersededByCardId') IS NOT NULL`;

  return {
    ...adapter,
    normalizeStored(raw, id, lang) {
      if (isTcgtrackingFallbackData(raw)) {
        return normalizeTcgtrackingFallback(raw, id, config);
      }
      const card = adapter.normalizeStored(raw, id, lang);
      const productId = (raw as { tcgtrackingProductId?: unknown } | null)
        ?.tcgtrackingProductId;
      return card && typeof productId === "number"
        ? {
            ...card,
            image: card.image?.normal
              ? card.image
              : tcgtrackingCardImage(productId),
            tcgplayerId: String(productId),
          }
        : card;
    },
    async searchById(id, baseUrl) {
      const productId = tcgtrackingProductIdOf(id);
      if (productId === null) return adapter.searchById(id, baseUrl);
      const entry = (await loadTcgtrackingCatalog(categoryId)).find(
        (candidate) => candidate.product.id === productId,
      );
      if (!entry) return { success: false, message: `Card ${id} not found.` };
      return {
        success: true,
        message: "Successfully fetched card by id.",
        data: normalizeTcgtrackingFallback(
          { source: "tcgtracking", ...entry },
          id,
          config,
        ),
      };
    },
    excludedFromMatchingSql: adapter.excludedFromMatchingSql
      ? sql`((${adapter.excludedFromMatchingSql}) OR ${superseded})`
      : superseded,
  };
}
