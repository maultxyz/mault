import { sql } from "drizzle-orm";
import type { PlayingCard } from "@magic-vault/shared";
import {
  UNION_ARENA_COLLECTOR_NUMBER_SET_PATTERN,
  UNION_ARENA_EXT_KEYS,
  UNION_ARENA_LIST_SEPARATOR_PATTERN,
  UNION_ARENA_PRECIOUS_RARITY_PREFIX,
  UNION_ARENA_PRODUCT_VARIANT_TAG_PATTERN,
  UNION_ARENA_RARE_PRINTING_NAME_PATTERN,
  UNION_ARENA_RARITY_ABBREVIATION_PATTERN,
  UNION_ARENA_RARITY_NAMES,
  UNION_ARENA_RARITY_NONE,
  UNION_ARENA_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { UNION_ARENA_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../../interfaces/tcgtracking";
import { tcgtrackingCardImage } from "../../tcgtracking/catalog";
import {
  extText,
  htmlToPlainText,
} from "../../tcgtracking/fallback";

export function unionArenaCardName(entry: TcgtrackingCatalogEntry): string {
  return entry.product.name
    .replace(UNION_ARENA_PRODUCT_VARIANT_TAG_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function unionArenaCollectorNumber(entry: TcgtrackingCatalogEntry): string {
  return entry.product.number?.trim() ?? "";
}

export function unionArenaSetCode(entry: TcgtrackingCatalogEntry): string {
  const printedSet = UNION_ARENA_COLLECTOR_NUMBER_SET_PATTERN.exec(
    unionArenaCollectorNumber(entry),
  )?.[1];
  if (printedSet) return printedSet;
  const abbreviation = entry.set.abbreviation?.trim();
  return abbreviation || String(entry.set.id);
}

export function unionArenaRarity(rarity: string | null | undefined): string {
  if (!rarity || rarity === UNION_ARENA_RARITY_NONE) return "";
  const abbreviation = UNION_ARENA_RARITY_ABBREVIATION_PATTERN.exec(rarity);
  if (!abbreviation) return rarity;
  const [, precious, base, stars] = abbreviation;
  return [
    precious ? UNION_ARENA_PRECIOUS_RARITY_PREFIX : "",
    UNION_ARENA_RARITY_NAMES[base],
    stars ? ` ${stars.length}-Star` : "",
  ].join("");
}

function numberOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeUnionArenaCard(
  entry: TcgtrackingCatalogEntry,
  id: string,
  lang: string,
): PlayingCard {
  const ext = entry.product.ext_data ?? {};
  const typeLine = [
    extText(ext, UNION_ARENA_EXT_KEYS.cardType),
    extText(ext, UNION_ARENA_EXT_KEYS.seriesName),
    extText(ext, UNION_ARENA_EXT_KEYS.affinities),
  ]
    .filter((part): part is string => !!part)
    .join(" | ");
  const text = [UNION_ARENA_EXT_KEYS.description, UNION_ARENA_EXT_KEYS.trigger]
    .map((keys) => htmlToPlainText(extText(ext, keys)))
    .filter((part): part is string => !!part)
    .join("\n\n");
  return {
    id,
    name: unionArenaCardName(entry),
    image: tcgtrackingCardImage(entry.product.id),
    set: unionArenaSetCode(entry),
    setName: entry.set.name,
    collectorNumber: unionArenaCollectorNumber(entry),
    rarity: unionArenaRarity(entry.product.rarity),
    typeLine,
    text: text || undefined,
    power: extText(ext, UNION_ARENA_EXT_KEYS.battlePoints),
    colorIdentity: (extText(ext, UNION_ARENA_EXT_KEYS.activationEnergy) ?? "")
      .split(UNION_ARENA_LIST_SEPARATOR_PATTERN)
      .filter(Boolean),
    cmc: numberOrUndefined(extText(ext, UNION_ARENA_EXT_KEYS.requiredEnergy)),
    price: null,
    priceFoil: null,
    tcgplayerId: String(entry.product.id),
    lang,
    raw: entry,
  };
}

function rawEntry(card: PlayingCard): TcgtrackingCatalogEntry {
  return card.raw as TcgtrackingCatalogEntry;
}

export const unionArenaAdapter: CardSearchAdapter = {
  defaultUrl: UNION_ARENA_DEFAULT_URL,
  normalizeStored: (raw, id, lang) =>
    normalizeUnionArenaCard(raw as TcgtrackingCatalogEntry, id, lang),
  rarePrintingSql: sql`((data->'product'->>'name') ~ ${UNION_ARENA_RARE_PRINTING_NAME_PATTERN})`,
  releasedAtSql: sql`data->'set'->>'published_on'`,
  releaseSequenceSql: sql`CASE WHEN jsonb_typeof(data->'product'->'id') = 'number' THEN (data->'product'->>'id')::bigint END`,
  tcgplayer: {
    categoryId: UNION_ARENA_TCGPLAYER_CATEGORY_ID,
    productIdFromRaw: (card) => rawEntry(card).product.id,
    subTypes: () => ({
      price: ["Normal", "Foil"],
      priceFoil: ["Foil"],
    }),
  },
};
