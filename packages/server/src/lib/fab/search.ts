import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../card-search/constants";
import { fetchCardApi } from "../card-search/fetch";
import type { CardSearchAdapter } from "../card-search/types";
import { validateQuery } from "../card-search/validate";

export const FAB_DEFAULT_URL = "https://api.goagain.dev/v1/cards";

const PAGE_LIMIT = 100;

export interface FabPrinting {
  unique_id: string;
  set_printing_unique_id: string;
  id: string;
  set_id: string;
  edition: string;
  foiling: string;
  rarity: string;
  expansion_slot: boolean;
  artists: string[];
  art_variations: string[];
  flavor_text: string;
  flavor_text_plain: string;
  image_url: string | null;
  image_rotation_degrees: number;
  tcgplayer_product_id: string | null;
  tcgplayer_url: string | null;
}

export interface FabCard {
  unique_id: string;
  name: string;
  color: string;
  pitch: string;
  cost: string;
  power: string;
  defense: string;
  health: string;
  intelligence: string;
  arcane: string;
  types: string[];
  traits: string[];
  card_keywords: string[];
  functional_text: string;
  functional_text_plain: string;
  type_text: string;
  printings: FabPrinting[];
}

interface FabCardListResponse {
  data: FabCard[];
  total: number;
  limit: number;
  offset: number;
}

export function normalizeFabPrinting(
  card: FabCard,
  printing: FabPrinting,
): PlayingCard {
  return {
    id: printing.unique_id,
    name: card.name,
    image: printing.image_url
      ? { small: printing.image_url, normal: printing.image_url }
      : null,
    set: printing.set_id,
    setName: printing.set_id,
    collectorNumber: printing.id,
    rarity: (printing.rarity ?? "").toLowerCase(),
    typeLine: card.type_text ?? "",
    text: card.functional_text_plain || undefined,
    power: card.power || undefined,
    toughness: card.defense || card.health || undefined,
    colorIdentity: card.color ? [card.color] : [],
    artist: printing.artists?.length ? printing.artists.join(", ") : undefined,
    price: null,
    priceFoil: null,
    sourceUrl: printing.tcgplayer_url ?? undefined,
    cmc: card.cost ? Number(card.cost) : undefined,
    raw: { card, printing },
  };
}

// GET /v1/cards/{id} only resolves a card-level unique_id or exact name - a
// printing's own unique_id (what we key on, since that's the granularity a
// physical card/foil is scanned at) has no direct lookup, so finding one by
// id means paging through the catalog until it turns up.
export async function findPrinting(
  id: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<{ card: FabCard; printing: FabPrinting } | null> {
  let offset = 0;
  for (;;) {
    const url = `${baseUrl}?limit=${PAGE_LIMIT}&offset=${offset}`;
    const res = await fetchCardApi(url, { headers: CARD_API_HEADERS, signal });
    if (!res.ok) return null;

    const json = (await res.json()) as FabCardListResponse;
    for (const card of json.data) {
      const printing = card.printings.find((p) => p.unique_id === id);
      if (printing) return { card, printing };
    }

    offset += PAGE_LIMIT;
    if (offset >= json.total || json.data.length === 0) return null;
  }
}

export async function Search(
  query: string,
  baseUrl: string = FAB_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const url = `${baseUrl}?name=${encodeURIComponent(query)}&limit=60`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (!response.ok) {
    return {
      message: "Failed to fetch from the Flesh and Blood Cards API.",
      success: false,
    };
  }

  const json = (await response.json()) as FabCardListResponse;
  if (json.data.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  const cards = json.data.flatMap((card) =>
    card.printings.map((printing) => normalizeFabPrinting(card, printing)),
  );

  return {
    message: "Cards successfully retrieved.",
    data: cards,
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = FAB_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const match = await findPrinting(id, baseUrl);
  if (!match) {
    return { success: false, message: `Card ${id} not found.` };
  }

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeFabPrinting(match.card, match.printing),
  };
}

export const fabAdapter: CardSearchAdapter = {
  defaultUrl: FAB_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
};
