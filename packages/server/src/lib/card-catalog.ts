import type { PlayingCard } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { CARD_SEARCH_FIELDS } from "./constants/collections";
import { EMPTY_CARD_CATALOG_COLUMNS } from "./constants/saved-cards";
import type {
  CardCatalogColumns,
  CatalogCardKey,
} from "./interfaces/saved-cards";
import { pgTextArray } from "./sql-arrays";

export function catalogCardKey({ gameKey, lang, cardId }: CatalogCardKey): string {
  return `${gameKey}\u0000${lang}\u0000${cardId}`;
}

export function normalizeCatalogCard(
  gameKey: string,
  lang: string,
  cardId: string,
  data: unknown,
): PlayingCard | null {
  if (data == null) return null;
  try {
    return ADAPTERS_BY_GAME_KEY[gameKey]?.normalizeStored(data, cardId, lang) ?? null;
  } catch (err) {
    console.warn(`[card-catalog] could not normalize ${gameKey}/${lang}/${cardId}:`, err);
    return null;
  }
}

export function catalogColumnsOf(card: PlayingCard | null): CardCatalogColumns {
  if (!card) return EMPTY_CARD_CATALOG_COLUMNS;
  const values = card as unknown as Record<string, unknown>;
  return {
    setName: card.setName || null,
    rarity: card.rarity || null,
    colorIdentity: Array.isArray(card.colorIdentity) ? card.colorIdentity : [],
    searchText: CARD_SEARCH_FIELDS.map((key) =>
      values[key] == null ? "" : String(values[key]),
    )
      .join("\n")
      .toLowerCase(),
    imageSmall: card.image?.small || null,
  };
}

export function catalogColumnsFor(
  gameKey: string,
  lang: string,
  cardId: string,
  data: unknown,
): CardCatalogColumns {
  return catalogColumnsOf(normalizeCatalogCard(gameKey, lang, cardId, data));
}

function groupKeysByGame(keys: CatalogCardKey[]): Map<string, CatalogCardKey[]> {
  const seen = new Set<string>();
  const byGame = new Map<string, CatalogCardKey[]>();
  for (const key of keys) {
    const id = catalogCardKey(key);
    if (seen.has(id)) continue;
    seen.add(id);
    byGame.set(key.gameKey, [...(byGame.get(key.gameKey) ?? []), key]);
  }
  return byGame;
}

async function selectCatalogRows(
  gameKey: string,
  keys: CatalogCardKey[],
  withData: boolean,
): Promise<{ card_id: string; lang: string; data: unknown }[]> {
  const result = await db.execute(sql`
    SELECT c.card_id, c.lang, ${withData ? sql`c.data` : sql`NULL::jsonb`} AS data
    FROM unnest(
      ${pgTextArray(keys.map((key) => key.lang))}::text[],
      ${pgTextArray(keys.map((key) => key.cardId))}::text[]
    ) AS k(lang, card_id)
    JOIN cards c ON c.game_key = ${gameKey} AND c.lang = k.lang AND c.card_id = k.card_id
    WHERE c.data IS NOT NULL
  `);
  return result.rows as { card_id: string; lang: string; data: unknown }[];
}

export async function loadCatalogCards(
  keys: CatalogCardKey[],
): Promise<Map<string, PlayingCard>> {
  const cards = new Map<string, PlayingCard>();
  for (const [gameKey, gameKeys] of groupKeysByGame(keys)) {
    for (const row of await selectCatalogRows(gameKey, gameKeys, true)) {
      const card = normalizeCatalogCard(gameKey, row.lang, row.card_id, row.data);
      if (card) {
        cards.set(catalogCardKey({ gameKey, lang: row.lang, cardId: row.card_id }), card);
      }
    }
  }
  return cards;
}

export async function findCatalogCardKeys(
  keys: CatalogCardKey[],
): Promise<Set<string>> {
  const found = new Set<string>();
  for (const [gameKey, gameKeys] of groupKeysByGame(keys)) {
    for (const row of await selectCatalogRows(gameKey, gameKeys, false)) {
      found.add(catalogCardKey({ gameKey, lang: row.lang, cardId: row.card_id }));
    }
  }
  return found;
}
