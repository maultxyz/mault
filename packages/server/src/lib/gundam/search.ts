import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../card-search/constants";
import { fetchCardApi } from "../card-search/fetch";
import type { CardSearchAdapter } from "../card-search/types";
import { validateQuery } from "../card-search/validate";

export const GUNDAM_DEFAULT_URL = "https://api.gcgapi.com/v1/cards";

interface GundamCard {
  product_id: string;
  card_number: string;
  name: string;
  set_code: string;
  set_name: string;
  rarity: string;
  card_type: string;
  color: string | null;
  cost: number | null;
  ap: number | null;
  hp: number | null;
  effect: string;
  image_url: string;
  detail_url: string | null;
}

function proxiedImageUrl(url: string): string {
  return `/api/cards/image-proxy?url=${encodeURIComponent(url)}`;
}

function normalizeGundamCard(raw: GundamCard): PlayingCard {
  const id = String(raw.product_id ?? raw.card_number ?? "");
  const image = raw.image_url ? proxiedImageUrl(raw.image_url) : "";
  const setCode = raw.set_code ?? "";
  const collectorNumber =
    String(raw.card_number ?? id)
      .split("-")
      .pop() ?? "";

  return {
    id,
    name: raw.name ?? "",
    image: image ? { small: image, normal: image } : null,
    set: setCode,
    setName: raw.set_name || setCode,
    collectorNumber,
    rarity: (raw.rarity ?? "").toLowerCase(),
    typeLine: raw.card_type ?? "",
    text: raw.effect || undefined,
    power: raw.ap != null ? String(raw.ap) : undefined,
    toughness: raw.hp != null ? String(raw.hp) : undefined,
    colorIdentity: raw.color ? [raw.color] : [],
    artist: undefined,
    price: null,
    priceFoil: null,
    sourceUrl: raw.detail_url ?? undefined,
    cmc: typeof raw.cost === "number" ? raw.cost : undefined,
    raw,
  };
}

function extractRows(json: unknown): GundamCard[] {
  if (Array.isArray(json)) return json as GundamCard[];
  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { data?: unknown }).data)
  ) {
    return (json as { data: GundamCard[] }).data;
  }
  return [];
}

function extractOne(json: unknown): GundamCard | null {
  if (
    json &&
    typeof json === "object" &&
    "data" in json &&
    (json as { data?: unknown }).data
  ) {
    return (json as { data: GundamCard }).data;
  }
  return (json as GundamCard) ?? null;
}

export async function Search(
  query: string,
  baseUrl: string = GUNDAM_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const url = `${baseUrl}?name=${encodeURIComponent(query)}&limit=60`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (response.status === 404) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  if (!response.ok) {
    return {
      message: "Failed to fetch from the Gundam Card Game API.",
      success: false,
    };
  }

  const rows = extractRows(await response.json());

  return {
    message: "Cards successfully retrieved.",
    data: rows.map(normalizeGundamCard),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = GUNDAM_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const response = await fetchCardApi(`${baseUrl}/${id}`, {
    headers: CARD_API_HEADERS,
  });

  if (!response.ok) {
    return {
      success: false,
      message: `Gundam Card Game API error: ${response.status} for card ${id}`,
    };
  }

  const raw = extractOne(await response.json());
  if (!raw) {
    return { success: false, message: `Card ${id} not found.` };
  }

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeGundamCard(raw),
  };
}

export const gundamAdapter: CardSearchAdapter = {
  defaultUrl: GUNDAM_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
};
