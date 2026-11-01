import type { PlayingCard } from "@magic-vault/shared";
import {
  POKEMON_JAPAN_CARDMARKET_GAME_ID,
  POKEMON_JAPAN_EXT_KEYS,
  POKEMON_JAPAN_RARITY_NONE,
  POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { POKEMON_FOIL_TYPES_BY_TCGPLAYER_VARIANT } from "../../constants/pokemon";
import { POKEMON_JAPAN_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../../interfaces/tcgtracking";
import { tcgtrackingCardImage } from "../../tcgtracking/catalog";
import { extText, extValues } from "../../tcgtracking/fallback";
import { TCGTRACKING_GAMES } from "../../tcgtracking/games";
import { comparableProductName } from "../../tcgtracking/keys";

function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function pokemonJapanCardName(entry: TcgtrackingCatalogEntry): string {
  return comparableProductName(TCGTRACKING_GAMES.pokemon, entry.product);
}

export function pokemonJapanSetCode(entry: TcgtrackingCatalogEntry): string {
  return entry.set.abbreviation ?? String(entry.set.id);
}

export function normalizePokemonJapanCard(
  entry: TcgtrackingCatalogEntry,
  id: string,
  lang: string,
): PlayingCard {
  const ext = entry.product.ext_data ?? {};
  const text = [
    extText(ext, POKEMON_JAPAN_EXT_KEYS.description),
    ...POKEMON_JAPAN_EXT_KEYS.attacks.map((keys) => extText(ext, keys)),
  ]
    .filter((part): part is string => !!part)
    .map(plainText)
    .join("\n\n");
  const retreatCost = Number(extText(ext, POKEMON_JAPAN_EXT_KEYS.retreatCost));
  const rarity = entry.product.rarity ?? "";
  return {
    id,
    name: pokemonJapanCardName(entry),
    image: tcgtrackingCardImage(entry.product.id),
    set: pokemonJapanSetCode(entry),
    setName: entry.set.name,
    collectorNumber: entry.product.number?.split("/")[0].trim() ?? "",
    rarity: rarity === POKEMON_JAPAN_RARITY_NONE ? "" : rarity,
    typeLine: extText(ext, POKEMON_JAPAN_EXT_KEYS.stage) ?? "",
    text: text || undefined,
    toughness: extText(ext, POKEMON_JAPAN_EXT_KEYS.hitPoints),
    colorIdentity: extValues(ext, POKEMON_JAPAN_EXT_KEYS.energyTypes),
    artist: extText(ext, POKEMON_JAPAN_EXT_KEYS.artist),
    price: null,
    priceFoil: null,
    cmc: Number.isFinite(retreatCost) ? retreatCost : undefined,
    tcgplayerId: String(entry.product.id),
    lang,
    raw: entry,
  };
}

function rawEntry(card: PlayingCard): TcgtrackingCatalogEntry {
  return card.raw as TcgtrackingCatalogEntry;
}

export const pokemonJapanAdapter: CardSearchAdapter = {
  defaultUrl: POKEMON_JAPAN_DEFAULT_URL,
  normalizeStored: (raw, id, lang) =>
    normalizePokemonJapanCard(raw as TcgtrackingCatalogEntry, id, lang),
  ocrMatchesByPrintedSetAndNumber: true,
  tcgplayer: {
    categoryId: POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
    foilTypeOfVariant: (variant) =>
      POKEMON_FOIL_TYPES_BY_TCGPLAYER_VARIANT[variant] ?? variant,
    productIdFromRaw: (card) => rawEntry(card).product.id,
    subTypes: () => ({
      price: ["Normal", "Holofoil"],
      priceFoil: ["Holofoil", "Reverse Holofoil"],
    }),
  },
  cardmarket: {
    gameId: POKEMON_JAPAN_CARDMARKET_GAME_ID,
    siteGamePath: "Pokemon",
    productIdFromRaw: (card) => rawEntry(card).product.cardmarket_id,
  },
};
