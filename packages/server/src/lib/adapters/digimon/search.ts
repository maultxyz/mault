import { sql } from "drizzle-orm";
import type { PlayingCard } from "@magic-vault/shared";
import {
  DIGIMON_CARDMARKET_GAME_ID,
  DIGIMON_EXT_KEYS,
  DIGIMON_PRODUCT_NUMBER_TAG_PATTERN,
  DIGIMON_PRODUCT_VARIANT_TAG_PATTERN,
  DIGIMON_RARE_PRINTING_NAME_PATTERN,
  DIGIMON_RARITY_NONE,
  DIGIMON_SET_ABBREVIATION_PATTERN,
  DIGIMON_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { DIGIMON_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../../interfaces/tcgtracking";
import { tcgtrackingCardImage } from "../../tcgtracking/catalog";
import {
  extText,
  extValues,
  htmlToPlainText,
} from "../../tcgtracking/fallback";

export function digimonCardName(entry: TcgtrackingCatalogEntry): string {
  return entry.product.name
    .replace(DIGIMON_PRODUCT_NUMBER_TAG_PATTERN, "")
    .replace(DIGIMON_PRODUCT_VARIANT_TAG_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function digimonCollectorNumber(entry: TcgtrackingCatalogEntry): string {
  return entry.product.number?.trim().split(/\s+/)[0] ?? "";
}

export function digimonSetCode(entry: TcgtrackingCatalogEntry): string {
  const abbreviation = entry.set.abbreviation?.trim();
  if (!abbreviation) return String(entry.set.id);
  return abbreviation.replace(DIGIMON_SET_ABBREVIATION_PATTERN, "$1$2$3");
}

function numberOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeDigimonCard(
  entry: TcgtrackingCatalogEntry,
  id: string,
  lang: string,
): PlayingCard {
  const ext = entry.product.ext_data ?? {};
  const collectorNumber = digimonCollectorNumber(entry);
  const level = extText(ext, DIGIMON_EXT_KEYS.level);
  const typeLine = [
    extText(ext, DIGIMON_EXT_KEYS.cardType),
    level ? `Lv.${level}` : undefined,
    extText(ext, DIGIMON_EXT_KEYS.form),
    extText(ext, DIGIMON_EXT_KEYS.attribute),
    extText(ext, DIGIMON_EXT_KEYS.traits),
  ]
    .filter((part): part is string => !!part)
    .join(" | ");
  const text = DIGIMON_EXT_KEYS.effects
    .map((keys) => htmlToPlainText(extText(ext, keys))?.replace(/\n\s*\n/g, "\n"))
    .filter((part): part is string => !!part)
    .join("\n\n");
  const rarity = entry.product.rarity ?? "";
  return {
    id,
    name: digimonCardName(entry),
    image: tcgtrackingCardImage(entry.product.id),
    set: digimonSetCode(entry),
    setName: entry.set.name,
    collectorNumber,
    rarity: rarity === DIGIMON_RARITY_NONE ? "" : rarity,
    typeLine,
    text: text || undefined,
    power: extText(ext, DIGIMON_EXT_KEYS.dp),
    colorIdentity: extValues(ext, DIGIMON_EXT_KEYS.colors),
    price: null,
    priceFoil: null,
    cmc: numberOrUndefined(extText(ext, DIGIMON_EXT_KEYS.playCost)),
    tcgplayerId: String(entry.product.id),
    lang,
    raw: entry,
  };
}

function rawEntry(card: PlayingCard): TcgtrackingCatalogEntry {
  return card.raw as TcgtrackingCatalogEntry;
}

export const digimonAdapter: CardSearchAdapter = {
  defaultUrl: DIGIMON_DEFAULT_URL,
  normalizeStored: (raw, id, lang) =>
    normalizeDigimonCard(raw as TcgtrackingCatalogEntry, id, lang),
  rarePrintingSql: sql`((data->'product'->>'name') ~ ${DIGIMON_RARE_PRINTING_NAME_PATTERN})`,
  releasedAtSql: sql`data->'set'->>'published_on'`,
  releaseSequenceSql: sql`CASE WHEN jsonb_typeof(data->'product'->'id') = 'number' THEN (data->'product'->>'id')::bigint END`,
  tcgplayer: {
    categoryId: DIGIMON_TCGPLAYER_CATEGORY_ID,
    productIdFromRaw: (card) => rawEntry(card).product.id,
    subTypes: () => ({
      price: ["Normal", "Foil"],
      priceFoil: ["Foil"],
    }),
  },
  cardmarket: {
    gameId: DIGIMON_CARDMARKET_GAME_ID,
    siteGamePath: "Digimon",
    productIdFromRaw: (card) => rawEntry(card).product.cardmarket_id,
  },
};
