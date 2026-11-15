import { sql } from "drizzle-orm";
import type { CardSearchAdapter } from "../interfaces/card-search";
import { tcgtrackingCardImage } from "./catalog";
import { TCGTRACKING_FALLBACK_SOURCE } from "../constants/tcgtracking";
import {
  isTcgtrackingFallbackData,
  normalizeTcgtrackingFallback,
  withFallbackIdentity,
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
  const isFallback = sql`(data->>'source') = ${TCGTRACKING_FALLBACK_SOURCE}`;

  return {
    ...adapter,
    normalizeStored(raw, id, lang) {
      if (isTcgtrackingFallbackData(raw)) {
        const fallbackCard = normalizeTcgtrackingFallback(raw, id, config);
        if (!config.normalizesFallbackThroughPrimaryAdapter || !raw.tcgtrackingSet) {
          return fallbackCard;
        }
        const primaryCard = adapter.normalizeStored(raw, id, lang);
        return primaryCard
          ? withFallbackIdentity(primaryCard, fallbackCard)
          : fallbackCard;
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
    cardmarket: adapter.cardmarket && {
      ...adapter.cardmarket,
      productIdFromRaw(card) {
        if (isTcgtrackingFallbackData(card.raw)) {
          return card.raw.product.cardmarket_id;
        }
        return adapter.cardmarket?.productIdFromRaw?.(card);
      },
      productNames: adapter.cardmarket.productNames
        ? (card) =>
            isTcgtrackingFallbackData(card.raw)
              ? []
              : (adapter.cardmarket?.productNames?.(card) ?? [])
        : undefined,
    },
    releasedAtSql: adapter.releasedAtSql
      ? sql`CASE WHEN ${isFallback} THEN data->'set'->>'published_on' ELSE (${adapter.releasedAtSql}) END`
      : undefined,
    releaseSequenceSql: sql`CASE
      WHEN jsonb_typeof(data->'tcgtrackingProductId') = 'number' THEN (data->>'tcgtrackingProductId')::bigint
      WHEN ${isFallback} AND jsonb_typeof(data->'product'->'id') = 'number' THEN (data->'product'->>'id')::bigint
    END`,
    excludedFromMatchingSql: adapter.excludedFromMatchingSql
      ? sql`((${adapter.excludedFromMatchingSql}) OR ${superseded})`
      : superseded,
  };
}
