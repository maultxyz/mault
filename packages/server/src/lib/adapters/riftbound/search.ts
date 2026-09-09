import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../../card-search/constants";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../card-search/types";
import { validateQuery } from "../../card-search/validate";

export const RIFTBOUND_DEFAULT_URL = "https://api.riftcodex.com/cards";

const SEARCH_PAGE_SIZE = 30;

export interface RiftboundCard {
  id: string;
  name: string;
  riftbound_id: string;
  tcgplayer_id: string;
  collector_number: number;
  attributes: {
    energy?: number | null;
    might?: number | null;
    power?: number | null;
  };
  classification: {
    type: string;
    supertype?: string | null;
    rarity: string;
    domain: string[];
  };
  text: {
    rich: string;
    plain: string;
    flavour?: string | null;
  };
  set: {
    set_id: string;
    label: string;
  };
  media: {
    image_url: string;
    artist: string;
    accessibility_text: string;
  };
  tags: string[];
  orientation: string;
  metadata: {
    clean_name: string;
    updated_on: string;
    alternate_art: boolean;
    overnumbered: boolean;
    signature: boolean;
  };
  new?: boolean;
}

interface RiftboundListResponse {
  items: RiftboundCard[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export function normalizeRiftboundCard(raw: RiftboundCard): PlayingCard {
  const typeLine = raw.classification.supertype
    ? `${raw.classification.type} - ${raw.classification.supertype}`
    : raw.classification.type;

  return {
    id: raw.id,
    name: raw.name,
    image: raw.media?.image_url
      ? { small: raw.media.image_url, normal: raw.media.image_url }
      : null,
    set: raw.set?.set_id ?? "",
    setName: raw.set?.label ?? raw.set?.set_id ?? "",
    collectorNumber: String(raw.collector_number ?? ""),
    rarity: (raw.classification?.rarity ?? "").toLowerCase(),
    typeLine,
    text: raw.text?.plain || undefined,
    power:
      raw.attributes?.might != null ? String(raw.attributes.might) : undefined,
    toughness: undefined,
    colorIdentity: raw.classification?.domain ?? [],
    artist: raw.media?.artist || undefined,
    price: null,
    priceFoil: null,
    sourceUrl: raw.tcgplayer_id
      ? `https://www.tcgplayer.com/product/${raw.tcgplayer_id}`
      : undefined,
    cmc: raw.attributes?.energy ?? undefined,
    raw,
  };
}

export async function Search(
  query: string,
  baseUrl: string = RIFTBOUND_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const url = `${baseUrl}/name?fuzzy=${encodeURIComponent(query)}&size=${SEARCH_PAGE_SIZE}`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (!response.ok) {
    return {
      message: "Failed to fetch from the Riftcodex API.",
      success: false,
    };
  }

  const data = (await response.json()) as RiftboundListResponse;
  if (data.items.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  return {
    message: "Cards successfully retrieved.",
    data: data.items.map(normalizeRiftboundCard),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = RIFTBOUND_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const response = await fetchCardApi(`${baseUrl}/${id}`, {
    headers: CARD_API_HEADERS,
  });

  if (!response.ok) {
    return {
      success: false,
      message: `Riftcodex API error: ${response.status} for card ${id}`,
    };
  }

  const raw = (await response.json()) as RiftboundCard;

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeRiftboundCard(raw),
  };
}

export const riftboundAdapter: CardSearchAdapter = {
  defaultUrl: RIFTBOUND_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
};
