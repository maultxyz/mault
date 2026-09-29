import type { PlayingCard, Result } from "@magic-vault/shared";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../card-search/types";
import { validateQuery } from "../../card-search/validate";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { SWU_CARD_PAGE_URL, SWU_FOIL_VARIANT_TYPES } from "../../constants/swu";
import { SWU_DEFAULT_URL } from "../../constants/urls";
import type { SwuCard, SwuCardList } from "../../interfaces/swu";

export function swuCardId(set: string, number: string): string {
  return `${set}-${number}`;
}

export function parseSwuCardId(
  id: string,
): { set: string; number: string } | null {
  const idx = id.indexOf("-");
  if (idx <= 0 || idx === id.length - 1) return null;
  return { set: id.slice(0, idx), number: id.slice(idx + 1) };
}

export function swuCardName(raw: Pick<SwuCard, "Name" | "Subtitle">): string {
  return raw.Subtitle ? `${raw.Name} - ${raw.Subtitle}` : raw.Name;
}

export function isSwuFoilVariant(raw: Pick<SwuCard, "VariantType">): boolean {
  return SWU_FOIL_VARIANT_TYPES.includes(raw.VariantType);
}

function toNumber(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSwuCard(raw: SwuCard): PlayingCard {
  const text = [raw.FrontText, raw.EpicAction, raw.BackText]
    .filter((part): part is string => !!part)
    .join("\n\n");
  const cost = toNumber(raw.Cost);

  return {
    id: swuCardId(raw.Set, raw.Number),
    name: swuCardName(raw),
    image: raw.FrontArt ? { small: raw.FrontArt, normal: raw.FrontArt } : null,
    set: raw.Set,
    setName: raw.Set,
    collectorNumber: raw.Number,
    rarity: (raw.Rarity ?? "").toLowerCase(),
    typeLine: raw.Traits?.length
      ? `${raw.Type} - ${raw.Traits.join(", ")}`
      : raw.Type,
    text: text || undefined,
    power: raw.Power || undefined,
    toughness: raw.HP || undefined,
    colorIdentity: raw.Aspects ?? [],
    artist: raw.Artist || undefined,
    price: toNumber(raw.MarketPrice),
    priceFoil: toNumber(raw.FoilPrice),
    sourceUrl: `${SWU_CARD_PAGE_URL}/${raw.Set}/${raw.Number}`,
    tcgplayerId: raw.tcgplayerId || undefined,
    cmc: cost ?? undefined,
    raw,
  };
}

export async function Search(
  query: string,
  baseUrl: string = SWU_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (!response.ok) {
    return {
      message: "Failed to fetch from the SWU-DB API.",
      success: false,
    };
  }

  const list = (await response.json()) as SwuCardList;
  const cards = list.data.filter((card) => !isSwuFoilVariant(card));
  if (cards.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  return {
    message: "Cards successfully retrieved.",
    data: cards.map(normalizeSwuCard),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = SWU_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const parsed = parseSwuCardId(id);
  if (!parsed) {
    return { success: false, message: `Card ${id} not found.` };
  }

  const response = await fetchCardApi(
    `${baseUrl}/${parsed.set}/${parsed.number}`,
    { headers: CARD_API_HEADERS },
  );

  if (!response.ok) {
    return {
      success: false,
      message: `SWU-DB API error: ${response.status} for card ${id}`,
    };
  }

  const raw = (await response.json()) as SwuCard;

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeSwuCard(raw),
  };
}

export const swuAdapter: CardSearchAdapter = {
  defaultUrl: SWU_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
  normalizeStored: (raw) => normalizeSwuCard(raw as SwuCard),
  tcgplayer: {
    categoryId: 79,
    subTypes: () => ({ price: ["Normal"], priceFoil: ["Foil"] }),
  },
  cardmarket: {
    gameId: 21,
    productNames: (card) => [card.name],
  },
};
