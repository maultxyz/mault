import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../card-search/constants";
import { fetchCardApi } from "../card-search/fetch";
import type { CardSearchAdapter } from "../card-search/types";
import { validateQuery } from "../card-search/validate";

export const YUGIOH_DEFAULT_URL =
  "https://db.ygoprodeck.com/api/v7/cardinfo.php";

export interface YgoCardSet {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code?: string;
  set_price?: string;
}

export interface YgoCardImage {
  id: number;
  image_url: string;
  image_url_small: string;
  image_url_cropped?: string;
}

export interface YgoCardPrice {
  cardmarket_price?: string;
  tcgplayer_price?: string;
  ebay_price?: string;
  amazon_price?: string;
  coolstuffinc_price?: string;
}

export interface YgoCard {
  id: number;
  name: string;
  type: string;
  frameType?: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  scale?: number;
  linkval?: number;
  race?: string;
  attribute?: string;
  archetype?: string;
  ygoprodeck_url?: string;
  card_sets?: YgoCardSet[];
  card_images?: YgoCardImage[];
  card_prices?: YgoCardPrice[];
}

interface YgoApiResponse {
  data?: YgoCard[];
  error?: string;
}

export function splitSetCode(setCode: string): { set: string; number: string } {
  const idx = setCode.lastIndexOf("-");
  if (idx <= 0) return { set: setCode, number: "" };
  return { set: setCode.slice(0, idx), number: setCode.slice(idx + 1) };
}

function resolvePrice(prices: YgoCardPrice[] | undefined): number | null {
  const p = prices?.[0];
  if (!p) return null;
  const value = Number(p.tcgplayer_price ?? p.cardmarket_price);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeOne(
  raw: YgoCard,
  image: YgoCardImage | undefined,
): PlayingCard {
  const id = image ? image.id : raw.id;
  const primarySet = raw.card_sets?.[0];
  const { set, number } = primarySet
    ? splitSetCode(primarySet.set_code)
    : { set: "", number: "" };

  return {
    id: String(id),
    name: raw.name,
    image: image
      ? { small: image.image_url_small, normal: image.image_url }
      : null,
    set,
    setName: primarySet?.set_name ?? "",
    collectorNumber: number || String(id),
    rarity: (primarySet?.set_rarity ?? "").toLowerCase(),
    typeLine: raw.race ? `${raw.type} — ${raw.race}` : raw.type,
    text: raw.desc || undefined,
    power: raw.atk != null ? String(raw.atk) : undefined,
    toughness: raw.def != null ? String(raw.def) : undefined,
    colorIdentity: raw.attribute ? [raw.attribute] : [],
    artist: undefined,
    price: resolvePrice(raw.card_prices),
    priceFoil: null,
    sourceUrl: raw.ygoprodeck_url,
    cmc: raw.level ?? raw.linkval ?? raw.scale,
    raw,
  };
}

export function normalizeYugiohCard(raw: YgoCard): PlayingCard[] {
  const images = raw.card_images?.length ? raw.card_images : [undefined];
  return images.map((image) => normalizeOne(raw, image));
}

export async function Search(
  query: string,
  baseUrl: string = YUGIOH_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const url = `${baseUrl}?fname=${encodeURIComponent(query)}`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (response.status === 400) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  if (!response.ok) {
    return {
      message: "Failed to fetch from the YGOPRODeck API.",
      success: false,
    };
  }

  const json = (await response.json()) as YgoApiResponse;
  const rows = json.data ?? [];

  if (rows.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  return {
    message: "Cards successfully retrieved.",
    data: rows.flatMap(normalizeYugiohCard),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = YUGIOH_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const url = `${baseUrl}?id=${encodeURIComponent(id)}`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (!response.ok) {
    return {
      success: false,
      message: `YGOPRODeck API error: ${response.status} for card ${id}`,
    };
  }

  const json = (await response.json()) as YgoApiResponse;
  const raw = json.data?.[0];
  if (!raw) {
    return { success: false, message: `Card ${id} not found.` };
  }

  const variants = normalizeYugiohCard(raw);
  const match = variants.find((c) => c.id === id) ?? variants[0];

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: match,
  };
}

export const yugiohAdapter: CardSearchAdapter = {
  defaultUrl: YUGIOH_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
};
