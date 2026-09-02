import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../card-search/constants";
import { fetchCardApi } from "../card-search/fetch";
import type { CardSearchAdapter } from "../card-search/types";
import { validateQuery } from "../card-search/validate";

export const LORCANA_DEFAULT_URL = "https://api.lorcast.com/v0/cards";

export const LORCANA_DE_API_ROOT = "https://lorcana-de-api.onrender.com/api";
export const LORCANA_DE_DEFAULT_URL = `${LORCANA_DE_API_ROOT}/cards`;

interface LorcastImageUris {
  small: string;
  normal: string;
  large: string;
}

export interface LorcastCard {
  id: string;
  name: string;
  version?: string | null;
  released_at?: string;
  image_uris?: { digital: LorcastImageUris };
  cost: number;
  inkwell: boolean;
  ink: string | null;
  type: string[];
  classifications?: string[] | null;
  text?: string;
  strength?: number | null;
  willpower?: number | null;
  lore?: number | null;
  rarity: string;
  illustrators?: string[];
  collector_number: string;
  lang: string;
  set: { id: string; code: string; name: string };
  prices?: { usd: string | number | null; usd_foil: string | number | null };
}

export function lorcanaCardId(
  setCode: string,
  collectorNumber: string,
): string {
  return `${setCode}-${collectorNumber}`;
}

export function parseLorcanaCardId(
  id: string,
): { setCode: string; number: string } | null {
  const idx = id.indexOf("-");
  if (idx <= 0 || idx === id.length - 1) return null;
  return { setCode: id.slice(0, idx), number: id.slice(idx + 1) };
}

export function lorcanaCardName(raw: {
  name: string;
  version?: string | null;
}): string {
  return raw.version ? `${raw.name} - ${raw.version}` : raw.name;
}

export function normalizeLorcanaCard(raw: LorcastCard): PlayingCard {
  const image = raw.image_uris?.digital;

  return {
    id: lorcanaCardId(raw.set.code, raw.collector_number),
    name: lorcanaCardName(raw),
    image: image ? { small: image.small, normal: image.normal } : null,
    set: raw.set.code,
    setName: raw.set.name,
    collectorNumber: raw.collector_number,
    rarity: (raw.rarity ?? "").toLowerCase().replace(/_/g, " "),
    typeLine: raw.classifications?.length
      ? `${raw.type.join(" ")} — ${raw.classifications.join(", ")}`
      : raw.type.join(" "),
    text: raw.text || undefined,
    power: raw.strength != null ? String(raw.strength) : undefined,
    toughness: raw.willpower != null ? String(raw.willpower) : undefined,
    colorIdentity: raw.ink ? [raw.ink] : [],
    artist: raw.illustrators?.length ? raw.illustrators.join(", ") : undefined,
    price: raw.prices?.usd != null ? Number(raw.prices.usd) : null,
    priceFoil:
      raw.prices?.usd_foil != null ? Number(raw.prices.usd_foil) : null,
    cmc: raw.cost,
    raw,
  };
}

export interface LorcanaDeCardImages {
  thumbnail: string;
  full: string;
  foilMask?: string;
}

export interface LorcanaDeAbility {
  name: string;
  effect: string;
  fullText: string;
  type: string;
}

export interface LorcanaDeCard {
  id: number;
  name: string;
  version?: string | null;
  fullName: string;
  code: string;
  number: number;
  setCode: string;
  rarity: string;
  type: string;
  subtypes?: string[];
  subtypesText?: string;
  cost: number;
  inkwell: boolean;
  color: string;
  strength?: number | null;
  willpower?: number | null;
  lore?: number | null;
  story?: string;
  artists?: string[];
  artistsText?: string;
  images?: LorcanaDeCardImages;
  abilities?: LorcanaDeAbility[];
  fullText?: string;
  flavorText?: string;
  externalLinks?: { cardmarketUrl?: string; tcgPlayerUrl?: string };
}

export function lorcanaDeCardName(raw: LorcanaDeCard): string {
  return raw.fullName || raw.name;
}

export function normalizeLorcanaDeCard(raw: LorcanaDeCard): PlayingCard {
  const typeLine = raw.subtypesText
    ? `${raw.type} — ${raw.subtypesText}`
    : raw.type;

  return {
    id: String(raw.id),
    name: lorcanaDeCardName(raw),
    image: raw.images
      ? { small: raw.images.thumbnail, normal: raw.images.full }
      : null,
    set: raw.setCode,
    setName: raw.setCode,
    collectorNumber: raw.code,
    rarity: (raw.rarity ?? "").toLowerCase(),
    typeLine,
    text:
      raw.fullText ||
      raw.abilities?.map((a) => a.fullText).join("\n\n") ||
      undefined,
    power: raw.strength != null ? String(raw.strength) : undefined,
    toughness: raw.willpower != null ? String(raw.willpower) : undefined,
    colorIdentity: raw.color ? [raw.color] : [],
    artist: raw.artistsText || raw.artists?.join(", "),
    price: null,
    priceFoil: null,
    sourceUrl: raw.externalLinks?.cardmarketUrl,
    cmc: raw.cost,
    raw,
  };
}

function isGermanApi(baseUrl: string): boolean {
  return baseUrl.startsWith(LORCANA_DE_DEFAULT_URL);
}

export async function Search(
  query: string,
  baseUrl: string = LORCANA_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  if (isGermanApi(baseUrl)) {
    const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
    const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

    if (!response.ok) {
      return {
        message: "Failed to fetch from the Lorcana DE API.",
        success: false,
      };
    }

    const data = (await response.json()) as { cards: LorcanaDeCard[] };
    if (data.cards.length === 0) {
      return {
        message: `No cards were found with the query: ${query}`,
        success: false,
      };
    }

    return {
      message: "Cards successfully retrieved.",
      data: data.cards.map(normalizeLorcanaDeCard),
      success: true,
    };
  }

  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&unique=prints`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (response.status === 404) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  if (!response.ok) {
    return {
      message: "Failed to fetch from the Lorcast API.",
      success: false,
    };
  }

  const data = (await response.json()) as { results: LorcastCard[] };

  return {
    message: "Cards successfully retrieved.",
    data: data.results.map(normalizeLorcanaCard),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = LORCANA_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  if (isGermanApi(baseUrl)) {
    const response = await fetchCardApi(`${baseUrl}/${id}`, {
      headers: CARD_API_HEADERS,
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Lorcana DE API error: ${response.status} for card ${id}`,
      };
    }

    const raw = (await response.json()) as LorcanaDeCard;

    return {
      success: true,
      message: "Successfully fetched card by id.",
      data: normalizeLorcanaDeCard(raw),
    };
  }

  const parsed = parseLorcanaCardId(id);
  if (!parsed) {
    return { success: false, message: `Card ${id} not found.` };
  }

  const response = await fetchCardApi(
    `${baseUrl}/${parsed.setCode}/${parsed.number}`,
    {
      headers: CARD_API_HEADERS,
    },
  );

  if (!response.ok) {
    return {
      success: false,
      message: `Lorcast API error: ${response.status} for card ${id}`,
    };
  }

  const raw = (await response.json()) as LorcastCard;

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeLorcanaCard(raw),
  };
}

export const lorcanaAdapter: CardSearchAdapter = {
  defaultUrl: LORCANA_DEFAULT_URL,
  urlForLang: (lang) =>
    lang === "de" ? LORCANA_DE_DEFAULT_URL : LORCANA_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
};
