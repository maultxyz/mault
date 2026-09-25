import type { PlayingCard, Result } from "@magic-vault/shared";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../card-search/types";
import { validateQuery } from "../../card-search/validate";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { FAB_DEFAULT_URL } from "../../constants/urls";

const SEARCH_CARD_LIMIT = 12;
const STANDARD_FOILING = "S";
const TCGPLAYER_FOIL_NAMES: Record<string, string> = {
  S: "Normal",
  R: "Rainbow Foil",
  C: "Cold Foil",
  G: "Cold Foil",
};
// TCGplayer splits some older sets' printings by edition in the sub-type
// name itself, e.g. "1st Edition Rainbow Foil".
const TCGPLAYER_EDITION_PREFIXES: Record<string, string> = {
  A: "1st Edition ",
  F: "1st Edition ",
  U: "Unlimited Edition ",
};
const RETRY_DELAY_MS = 250;

// Fleshcube's Heroku backend 500s on roughly half of requests once even two
// are in flight at once, so every call to it is funneled through one queue.
let fleshcubeQueue: Promise<unknown> = Promise.resolve();

export function fleshcubeFetch(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  const run = async () => {
    const init = { headers: CARD_API_HEADERS, signal };
    const res = await fetchCardApi(url, init);
    if (res.status < 500) return res;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchCardApi(url, init);
  };
  const next = fleshcubeQueue.then(run, run);
  fleshcubeQueue = next.catch(() => undefined);
  return next;
}

export interface FleshcubePrice {
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  priceLastUpdated: string | null;
}

export interface FleshcubePrinting {
  uniqueId: string;
  setPrintingUniqueId: string;
  cardId: string;
  setId: string;
  edition: string;
  foiling: string;
  rarity: string;
  expansionSlot: boolean;
  artists: string[];
  artVariations: string[];
  flavorText: string | null;
  flavorTextPlain: string | null;
  imageUrl: string | null;
  imageRotationDegrees: number;
  tcgplayerProductId: string | null;
  tcgplayerUrl: string | null;
  tcgPlayerPrice: FleshcubePrice | null;
}

export interface FleshcubeCard {
  uniqueId: string;
  name: string;
  color: string | null;
  pitch: string | null;
  cost: string | null;
  power: string | null;
  defense: string | null;
  health: string | null;
  intelligence: string | null;
  arcane: string | null;
  types: string[];
  traits: string[];
  keywords: string[];
  functionalText: string | null;
  functionalTextPlain: string | null;
  typeText: string | null;
  cardPrintings: FleshcubePrinting[];
}

// /card/search only returns a trimmed per-printing summary (no text, types,
// artists), enough to list the catalog but not to build a PlayingCard.
export interface FleshcubeSearchPrinting {
  uniqueId: string;
  cardId: string;
  setId: string;
  imageUrl: string | null;
}

export interface FleshcubeSearchCard {
  uniqueId: string;
  name: string;
  printings: FleshcubeSearchPrinting[];
}

export interface FleshcubeSearchResponse {
  results: FleshcubeSearchCard[];
  page: number;
  pageSize: number;
  total: number;
}

// `raw` keeps the snake_case shape of the previous goagain.dev source, since
// admin-configured fieldDefinitions paths (e.g. `card.type_text`) and cards
// already persisted in scan history both point into it.
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
  tcgplayer_price: FleshcubePrice | null;
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
}

export function searchUrl(
  baseUrl: string,
  page: number,
  pageSize: number,
  query?: string,
): string {
  const url = `${baseUrl}/search/${page}/${pageSize}`;
  return query ? `${url}?searchOptions=${encodeURIComponent(query)}` : url;
}

export function printingUrl(baseUrl: string, id: string): string {
  return `${baseUrl}/cardPrintingUniqueId/${encodeURIComponent(id)}`;
}

function toFabCard(card: FleshcubeCard): FabCard {
  return {
    unique_id: card.uniqueId,
    name: card.name,
    color: card.color ?? "",
    pitch: card.pitch ?? "",
    cost: card.cost ?? "",
    power: card.power ?? "",
    defense: card.defense ?? "",
    health: card.health ?? "",
    intelligence: card.intelligence ?? "",
    arcane: card.arcane ?? "",
    types: card.types,
    traits: card.traits,
    card_keywords: card.keywords,
    functional_text: card.functionalText ?? "",
    functional_text_plain: card.functionalTextPlain ?? "",
    type_text: card.typeText ?? "",
  };
}

function toFabPrinting(printing: FleshcubePrinting): FabPrinting {
  return {
    unique_id: printing.uniqueId,
    set_printing_unique_id: printing.setPrintingUniqueId,
    id: printing.cardId,
    set_id: printing.setId,
    edition: printing.edition,
    foiling: printing.foiling,
    rarity: printing.rarity,
    expansion_slot: printing.expansionSlot,
    artists: printing.artists,
    art_variations: printing.artVariations,
    flavor_text: printing.flavorText ?? "",
    flavor_text_plain: printing.flavorTextPlain ?? "",
    image_url: printing.imageUrl,
    image_rotation_degrees: printing.imageRotationDegrees,
    tcgplayer_product_id: printing.tcgplayerProductId,
    tcgplayer_url: printing.tcgplayerUrl,
    tcgplayer_price: printing.tcgPlayerPrice,
  };
}

export function normalizeFabPrinting(
  source: FleshcubeCard,
  sourcePrinting: FleshcubePrinting,
): PlayingCard {
  const card = toFabCard(source);
  const printing = toFabPrinting(sourcePrinting);
  const marketPrice = printing.tcgplayer_price?.marketPrice ?? null;
  const isFoil = printing.foiling !== STANDARD_FOILING;

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
    typeLine: card.type_text,
    text: card.functional_text_plain || undefined,
    power: card.power || undefined,
    toughness: card.defense || card.health || undefined,
    colorIdentity: card.color ? [card.color] : [],
    artist: printing.artists?.length ? printing.artists.join(", ") : undefined,
    price: marketPrice,
    priceFoil: isFoil ? marketPrice : null,
    sourceUrl: printing.tcgplayer_url ?? undefined,
    tcgplayerId: printing.tcgplayer_product_id ?? undefined,
    cmc: card.cost ? Number(card.cost) : undefined,
    raw: { card, printing },
  };
}

// Returns the full card (every printing included) that owns printing `id`.
export async function fetchCardByPrintingId(
  id: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<{ card: FleshcubeCard | null; url: string; status: number }> {
  const url = printingUrl(baseUrl, id);
  const res = await fleshcubeFetch(url, signal);
  if (!res.ok) return { card: null, url, status: res.status };
  return { card: (await res.json()) as FleshcubeCard, url, status: res.status };
}

export async function Search(
  query: string,
  baseUrl: string = FAB_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const response = await fleshcubeFetch(
    searchUrl(baseUrl, 1, SEARCH_CARD_LIMIT, query),
  );

  if (!response.ok) {
    return {
      message: "Failed to fetch from the Fleshcube API.",
      success: false,
    };
  }

  const json = (await response.json()) as FleshcubeSearchResponse;
  const printingIds = json.results
    .map((card) => card.printings[0]?.uniqueId)
    .filter((id): id is string => Boolean(id));

  const fullCards = await Promise.all(
    printingIds.map((id) => fetchCardByPrintingId(id, baseUrl)),
  );

  const cards = fullCards.flatMap(({ card }) =>
    card
      ? card.cardPrintings.map((printing) =>
          normalizeFabPrinting(card, printing),
        )
      : [],
  );

  if (cards.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

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
  const { card } = await fetchCardByPrintingId(id, baseUrl);
  const printing = card?.cardPrintings.find((p) => p.uniqueId === id);
  if (!card || !printing) {
    return { success: false, message: `Card ${id} not found.` };
  }

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeFabPrinting(card, printing),
  };
}

export const fabAdapter: CardSearchAdapter = {
  defaultUrl: FAB_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
  normalizeStored: (raw, id) => {
    const card = raw as FleshcubeCard;
    const printing = card.cardPrintings.find((p) => p.uniqueId === id);
    return printing ? normalizeFabPrinting(card, printing) : null;
  },
  tcgplayer: {
    categoryId: 62,
    productIdFromRaw: (card) =>
      (card.raw as { printing: FabPrinting }).printing.tcgplayer_product_id,
    subTypes: (card) => {
      const { printing } = card.raw as { printing: FabPrinting };
      const foil = TCGPLAYER_FOIL_NAMES[printing.foiling] ?? "Normal";
      const edition = TCGPLAYER_EDITION_PREFIXES[printing.edition];
      const subTypes = edition ? [`${edition}${foil}`, foil] : [foil];
      return {
        price: subTypes,
        priceFoil: printing.foiling === STANDARD_FOILING ? [] : subTypes,
      };
    },
  },
};
