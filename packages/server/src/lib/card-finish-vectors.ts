import {
  finishFamily,
  type CardFinishMatch,
  type CardSearchEmbeddings,
  type PlayingCard,
} from "@magic-vault/shared";
import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { cardFinishVectors, cardImageVectors } from "../db/schema";
import { toPortraitCardImage } from "./card-image";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { CARD_API_HEADERS } from "./constants/card-search";
import {
  CARD_FINISH_IMAGE_FETCH_DELAY_MS,
  CARD_FINISH_IMAGE_TIMEOUT_MS,
  CARD_FINISH_PROGRESS_LOG_EVERY,
  CARD_FINISH_VECTOR_BATCH_SIZE,
  CARD_FINISH_VECTOR_LANG,
} from "./constants/saved-cards";
import { pgTextArray } from "./sql-arrays";
import { tcgtrackingCardImage } from "./tcgtracking/catalog";
import { vectorizeCardImage } from "./vectorize";

export function detectableFoilTypes(card: PlayingCard): Set<string> {
  const byFamily = new Map<string, string[]>();
  for (const foilType of card.foilTypes ?? []) {
    const family = finishFamily(foilType);
    byFamily.set(family, [...(byFamily.get(family) ?? []), foilType]);
  }
  return new Set(
    [...byFamily.values()].filter((options) => options.length > 1).flat(),
  );
}

async function embedProductImage(productId: number): Promise<number[] | null> {
  await new Promise((resolve) => setTimeout(resolve, CARD_FINISH_IMAGE_FETCH_DELAY_MS));
  const response = await fetch(tcgtrackingCardImage(productId).normal, {
    headers: CARD_API_HEADERS,
    signal: AbortSignal.timeout(CARD_FINISH_IMAGE_TIMEOUT_MS),
  }).catch(() => null);
  if (!response?.ok) return null;
  const buffer = await toPortraitCardImage(Buffer.from(await response.arrayBuffer()));
  return (await vectorizeCardImage(buffer)).embedding;
}

export async function syncCardFinishVectors(
  gameKey: string,
  lang: string,
  log: (message: string) => void,
  isCancelled: () => boolean = () => false,
): Promise<number> {
  const adapter = ADAPTERS_BY_GAME_KEY[gameKey];
  const finishProducts = adapter?.tcgplayer?.finishProducts;
  if (!adapter || !finishProducts || lang !== CARD_FINISH_VECTOR_LANG) return 0;

  const stored = await db
    .select({
      cardId: cardFinishVectors.cardId,
      foilType: cardFinishVectors.foilType,
      productId: cardFinishVectors.productId,
    })
    .from(cardFinishVectors)
    .where(and(eq(cardFinishVectors.gameKey, gameKey), eq(cardFinishVectors.lang, lang)));
  const storedProduct = new Map(
    stored.map((row) => [`${row.cardId}\u0000${row.foilType}`, row.productId]),
  );

  log(`${gameKey}/${lang}: checking card finish images...`);
  let lastId = 0;
  let written = 0;
  let failed = 0;
  let checked = 0;
  while (!isCancelled()) {
    const rows = await db
      .select({ id: cardImageVectors.id, cardId: cardImageVectors.cardId, data: cardImageVectors.data })
      .from(cardImageVectors)
      .where(
        and(
          eq(cardImageVectors.gameKey, gameKey),
          eq(cardImageVectors.lang, lang),
          gt(cardImageVectors.id, lastId),
          isNotNull(cardImageVectors.data),
        ),
      )
      .orderBy(asc(cardImageVectors.id))
      .limit(CARD_FINISH_VECTOR_BATCH_SIZE);
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;
    checked += rows.length;
    log(`${gameKey}/${lang}: checked ${checked} card(s), ${written} finish image(s) vectorized so far.`);

    for (const row of rows) {
      if (isCancelled()) break;
      const card = adapter.normalizeStored(row.data, row.cardId, lang);
      if (!card) continue;
      const detectable = detectableFoilTypes(card);
      if (detectable.size === 0) continue;
      for (const finish of finishProducts(card)) {
        if (!detectable.has(finish.foilType)) continue;
        if (storedProduct.get(`${row.cardId}\u0000${finish.foilType}`) === finish.productId) {
          continue;
        }
        const embedding = await embedProductImage(finish.productId);
        if (!embedding) {
          failed++;
          log(`${gameKey}/${lang}: no image for ${row.cardId} ${finish.foilType} (product ${finish.productId}).`);
          continue;
        }
        await db
          .insert(cardFinishVectors)
          .values({
            gameKey,
            lang,
            cardId: row.cardId,
            foilType: finish.foilType,
            productId: finish.productId,
            embedding,
          })
          .onConflictDoUpdate({
            target: [
              cardFinishVectors.gameKey,
              cardFinishVectors.lang,
              cardFinishVectors.cardId,
              cardFinishVectors.foilType,
            ],
            set: {
              productId: sql`excluded.product_id`,
              embedding: sql`excluded.embedding`,
              updatedAt: new Date(),
            },
          });
        written++;
        if (written % CARD_FINISH_PROGRESS_LOG_EVERY === 0) {
          log(`${gameKey}/${lang}: ${written} finish image(s) vectorized (at ${row.cardId}).`);
        }
      }
    }
  }
  log(
    `${gameKey}/${lang}: ${written} card finish image(s) vectorized${failed ? `, ${failed} image(s) unavailable` : ""}.`,
  );
  return written;
}

export async function attachFinishMatches<T extends { cardId: string; lang?: string; card?: PlayingCard }>(
  matches: T[],
  gameKey: string,
  embeddings: CardSearchEmbeddings | undefined,
): Promise<T[]> {
  if (!embeddings?.embedding?.length) return matches;
  const candidates = matches.filter(
    (match) => match.card && detectableFoilTypes(match.card).size > 0,
  );
  if (candidates.length === 0) return matches;
  const query = `[${embeddings.embedding.join(",")}]`;
  const result = await db.execute(sql`
    SELECT card_id, foil_type, (embedding <=> ${query}::vector(128))::float8 AS distance
    FROM card_finish_vectors
    WHERE game_key = ${gameKey}
      AND lang = ${CARD_FINISH_VECTOR_LANG}
      AND card_id = ANY(${pgTextArray(candidates.map((match) => match.cardId))}::text[])
  `);
  const byCard = new Map<string, CardFinishMatch[]>();
  for (const row of result.rows as { card_id: string; foil_type: string; distance: number }[]) {
    byCard.set(row.card_id, [
      ...(byCard.get(row.card_id) ?? []),
      { foilType: row.foil_type, distance: row.distance },
    ]);
  }
  return matches.map((match) => {
    const finishMatches = byCard.get(match.cardId);
    return finishMatches && match.card
      ? { ...match, card: { ...match.card, finishMatches } }
      : match;
  });
}
