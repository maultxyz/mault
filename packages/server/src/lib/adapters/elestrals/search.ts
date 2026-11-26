import { sql } from "drizzle-orm";
import type { PlayingCard } from "@magic-vault/shared";
import {
  ELESTRALS_COLLECTOR_NUMBER_SET_PATTERN,
  ELESTRALS_EXT_KEYS,
  ELESTRALS_PRODUCT_VARIANT_TAG_PATTERN,
  ELESTRALS_RARE_PRINTING_NAME_PATTERN,
  ELESTRALS_RARITY_NAMES,
  ELESTRALS_SUBCLASS_SEPARATOR_PATTERN,
  ELESTRALS_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { ELESTRALS_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../../interfaces/tcgtracking";
import { tcgtrackingCardImage } from "../../tcgtracking/catalog";
import {
  extText,
  extValues,
  htmlToPlainText,
} from "../../tcgtracking/fallback";

export function elestralsCardName(entry: TcgtrackingCatalogEntry): string {
  return entry.product.name
    .replace(ELESTRALS_PRODUCT_VARIANT_TAG_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function elestralsCollectorNumber(entry: TcgtrackingCatalogEntry): string {
  return entry.product.number?.trim() ?? "";
}

export function elestralsSetCode(entry: TcgtrackingCatalogEntry): string {
  const printedSet = ELESTRALS_COLLECTOR_NUMBER_SET_PATTERN.exec(
    elestralsCollectorNumber(entry),
  )?.[1];
  if (printedSet) return printedSet;
  const abbreviation = entry.set.abbreviation?.trim();
  return abbreviation || String(entry.set.id);
}

export function normalizeElestralsCard(
  entry: TcgtrackingCatalogEntry,
  id: string,
  lang: string,
): PlayingCard {
  const ext = entry.product.ext_data ?? {};
  const subclass = extText(ext, ELESTRALS_EXT_KEYS.subclass)?.replace(
    ELESTRALS_SUBCLASS_SEPARATOR_PATTERN,
    " / ",
  );
  const typeLine = [
    extText(ext, ELESTRALS_EXT_KEYS.runeType),
    extText(ext, ELESTRALS_EXT_KEYS.cardType),
    subclass,
  ]
    .filter((part): part is string => !!part)
    .join(" | ");
  const rarity = entry.product.rarity ?? "";
  return {
    id,
    name: elestralsCardName(entry),
    image: tcgtrackingCardImage(entry.product.id),
    set: elestralsSetCode(entry),
    setName: entry.set.name,
    collectorNumber: elestralsCollectorNumber(entry),
    rarity: ELESTRALS_RARITY_NAMES[rarity] ?? rarity,
    typeLine,
    text: htmlToPlainText(extText(ext, ELESTRALS_EXT_KEYS.description)),
    power: extText(ext, ELESTRALS_EXT_KEYS.attack),
    toughness: extText(ext, ELESTRALS_EXT_KEYS.defense),
    colorIdentity: extValues(ext, ELESTRALS_EXT_KEYS.elementType),
    artist: extText(ext, ELESTRALS_EXT_KEYS.artist),
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

export const elestralsAdapter: CardSearchAdapter = {
  defaultUrl: ELESTRALS_DEFAULT_URL,
  normalizeStored: (raw, id, lang) =>
    normalizeElestralsCard(raw as TcgtrackingCatalogEntry, id, lang),
  rarePrintingSql: sql`((data->'product'->>'name') ~ ${ELESTRALS_RARE_PRINTING_NAME_PATTERN})`,
  releasedAtSql: sql`data->'set'->>'published_on'`,
  releaseSequenceSql: sql`CASE WHEN jsonb_typeof(data->'product'->'id') = 'number' THEN (data->'product'->>'id')::bigint END`,
  tcgplayer: {
    categoryId: ELESTRALS_TCGPLAYER_CATEGORY_ID,
    productIdFromRaw: (card) => rawEntry(card).product.id,
    subTypes: () => ({
      price: ["Normal", "Holo"],
      priceFoil: ["Holo", "Reverse Holo"],
    }),
  },
};
