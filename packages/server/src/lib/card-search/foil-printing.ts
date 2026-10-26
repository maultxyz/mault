import type { PlayingCardWithDistance } from "@magic-vault/shared";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { applyCardPrices } from "./card-prices";
import { ADAPTERS_BY_GAME_KEY } from "./resolve";

export async function findFoilPrinting(
  gameKey: string,
  card: PlayingCardWithDistance,
  foilType: string | null,
): Promise<PlayingCardWithDistance | null> {
  const adapter = ADAPTERS_BY_GAME_KEY[gameKey];
  const variants = adapter?.foilPrintingVariants;
  if (!variants || variants.matchesFoilType(card, foilType)) return null;

  const [current] = await db
    .select({
      lang: cardImageVectors.lang,
      name: cardImageVectors.name,
      setCode: cardImageVectors.setCode,
    })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.cardId, card.id),
      ),
    )
    .limit(1);
  if (!current) return null;

  const rows = await db
    .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, current.lang),
        eq(cardImageVectors.name, current.name),
        eq(cardImageVectors.setCode, current.setCode),
        ne(cardImageVectors.cardId, card.id),
        isNotNull(cardImageVectors.data),
        adapter.excludedFromMatchingSql
          ? sql`NOT coalesce(${adapter.excludedFromMatchingSql}, false)`
          : undefined,
      ),
    )
    .orderBy(cardImageVectors.collectorNumber);

  const printing = rows
    .map((row) => adapter.normalizeStored(row.data, row.cardId, current.lang))
    .find(
      (candidate) =>
        !!candidate &&
        variants.isSameArtwork(card, candidate) &&
        variants.matchesFoilType(candidate, foilType),
    );
  if (!printing) return null;

  const [priced] = await applyCardPrices(
    adapter,
    { gameKey, lang: current.lang },
    [printing],
  );
  return { ...priced, distance: card.distance, confidence: card.confidence };
}
