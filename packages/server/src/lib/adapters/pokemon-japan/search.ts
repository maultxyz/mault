import type { PlayingCard, Result } from "@magic-vault/shared";
import { validateQuery } from "../../card-search/validate";
import {
  POKEMON_JAPAN_CARDMARKET_GAME_ID,
  POKEMON_JAPAN_EXT_KEYS,
  POKEMON_JAPAN_RARITY_NONE,
  POKEMON_JAPAN_SEARCH_RECENT_SET_COUNT,
  POKEMON_JAPAN_SEARCH_RESULT_LIMIT,
  POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
} from "../../constants/card-search";
import { POKEMON_JAPAN_DEFAULT_URL } from "../../constants/urls";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import type { TcgtrackingCatalogEntry } from "../../interfaces/tcgtracking";
import {
  fetchTcgtrackingProductEntry,
  fetchTcgtrackingSetEntries,
  fetchTcgtrackingSets,
  tcgtrackingCardImage,
} from "../../tcgtracking/catalog";
import { extText, extValues } from "../../tcgtracking/fallback";
import { TCGTRACKING_GAMES } from "../../tcgtracking/games";
import { cardNameKey, comparableProductName } from "../../tcgtracking/keys";

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

async function searchRecentSets(query: string): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const recentSets = (await fetchTcgtrackingSets(POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID))
    .sort((a, b) => (b.published_on ?? "").localeCompare(a.published_on ?? ""))
    .slice(0, POKEMON_JAPAN_SEARCH_RECENT_SET_COUNT);
  const queryKey = cardNameKey(query);
  const matches: PlayingCard[] = [];
  for (const set of recentSets) {
    const entries = await fetchTcgtrackingSetEntries(
      POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
      set,
    );
    for (const entry of entries) {
      if (cardNameKey(pokemonJapanCardName(entry)).includes(queryKey)) {
        matches.push(
          normalizePokemonJapanCard(entry, String(entry.product.id), "ja"),
        );
      }
    }
    if (matches.length >= POKEMON_JAPAN_SEARCH_RESULT_LIMIT) break;
  }
  if (matches.length === 0) {
    return {
      success: false,
      message: `No cards were found in the newest Japanese Pokémon sets with the query: ${query}`,
    };
  }
  return {
    success: true,
    message: "Cards successfully retrieved.",
    data: matches.slice(0, POKEMON_JAPAN_SEARCH_RESULT_LIMIT),
  };
}

async function searchById(id: string): Promise<Result<PlayingCard>> {
  const productId = Number(id);
  const entry = Number.isInteger(productId)
    ? await fetchTcgtrackingProductEntry(
        POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
        productId,
      )
    : null;
  if (!entry) return { success: false, message: `Card ${id} not found.` };
  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizePokemonJapanCard(entry, id, "ja"),
  };
}

function rawEntry(card: PlayingCard): TcgtrackingCatalogEntry {
  return card.raw as TcgtrackingCatalogEntry;
}

export const pokemonJapanAdapter: CardSearchAdapter = {
  defaultUrl: POKEMON_JAPAN_DEFAULT_URL,
  search: searchRecentSets,
  searchById,
  normalizeStored: (raw, id, lang) =>
    normalizePokemonJapanCard(raw as TcgtrackingCatalogEntry, id, lang),
  ocrMatchesByPrintedSetAndNumber: true,
  tcgplayer: {
    categoryId: POKEMON_JAPAN_TCGPLAYER_CATEGORY_ID,
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
