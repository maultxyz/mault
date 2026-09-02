import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../card-search/constants";
import { fetchCardApi } from "../card-search/fetch";
import type { CardSearchAdapter } from "../card-search/types";
import { validateQuery } from "../card-search/validate";

export const SCRYFALL_DEFAULT_URL = "https://api.scryfall.com/cards";

interface ScryfallImageUris {
  small: string;
  normal: string;
}

interface ScryfallCardFace {
  name?: string;
  printed_name?: string;
  mana_cost?: string;
  oracle_text?: string;
  printed_text?: string;
  power?: string;
  toughness?: string;
  artist?: string;
  image_uris?: ScryfallImageUris;
}

interface ScryfallApiCard {
  id: string;
  lang?: string;
  name: string;
  printed_name?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  mana_cost?: string;
  cmc?: number;
  type_line: string;
  printed_type_line?: string;
  oracle_text?: string;
  printed_text?: string;
  power?: string;
  toughness?: string;
  color_identity: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  scryfall_uri: string;
  prices: { usd: string | null; usd_foil: string | null };
}

function withPrintedFields(raw: ScryfallApiCard): ScryfallApiCard {
  const face = raw.card_faces?.[0];
  return {
    ...raw,
    name: raw.printed_name ?? face?.printed_name ?? face?.name ?? raw.name,
    type_line: raw.printed_type_line ?? raw.type_line,
    oracle_text:
      raw.printed_text ??
      face?.printed_text ??
      raw.oracle_text ??
      face?.oracle_text,
  };
}

function normalizeScryfallCard(rawInput: ScryfallApiCard): PlayingCard {
  const raw = withPrintedFields(rawInput);
  const face = raw.card_faces?.[0];
  const imageUris = raw.image_uris ?? face?.image_uris;

  return {
    id: raw.id,
    name: raw.name,
    image: imageUris
      ? { small: imageUris.small, normal: imageUris.normal }
      : null,
    set: raw.set,
    setName: raw.set_name,
    collectorNumber: raw.collector_number,
    rarity: raw.rarity,
    typeLine: raw.type_line,
    text: raw.oracle_text,
    manaCost: raw.mana_cost ?? face?.mana_cost,
    power: raw.power ?? face?.power,
    toughness: raw.toughness ?? face?.toughness,
    colorIdentity: raw.color_identity,
    artist: raw.artist ?? face?.artist,
    price: raw.prices.usd != null ? Number.parseFloat(raw.prices.usd) : null,
    priceFoil:
      raw.prices.usd_foil != null
        ? Number.parseFloat(raw.prices.usd_foil)
        : null,
    sourceUrl: raw.scryfall_uri,
    cmc: raw.cmc,
    raw,
  };
}

export async function Search(
  query: string,
  baseUrl: string = SCRYFALL_DEFAULT_URL,
  lang?: string,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const scopedQuery = lang ? `${query} lang:${lang}` : query;
  const scryfallUrl = `${baseUrl}/search?q=${encodeURIComponent(scopedQuery)}&unique=prints&order=released&dir=desc`;

  const response = await fetchCardApi(scryfallUrl, {
    headers: CARD_API_HEADERS,
  });

  if (response.status === 404) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  if (!response.ok) {
    return {
      message: "Failed to fetch from Scryfall.",
      success: false,
    };
  }

  const data = (await response.json()) as { data: ScryfallApiCard[] };

  return {
    message: "Cards successfully retrieved.",
    data: data.data.map(normalizeScryfallCard),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = SCRYFALL_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const response = await fetchCardApi(`${baseUrl}/${id}`, {
    headers: CARD_API_HEADERS,
  });

  if (!response.ok) {
    return {
      success: false,
      message: `Scryfall API error: ${response.status} for card ${id}`,
    };
  }

  const raw = (await response.json()) as ScryfallApiCard;

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeScryfallCard(raw),
  };
}

export const scryfallAdapter: CardSearchAdapter = {
  defaultUrl: SCRYFALL_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
};
