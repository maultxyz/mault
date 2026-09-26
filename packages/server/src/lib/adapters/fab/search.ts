import type { PlayingCard, Result } from "@magic-vault/shared";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../card-search/types";
import { validateQuery } from "../../card-search/validate";
import {
  CARD_API_HEADERS,
  FAB_SEARCH_CARD_LIMIT,
  FAB_STANDARD_FOILING,
  FAB_TCGPLAYER_EDITION_PREFIXES,
  FAB_TCGPLAYER_FOIL_NAMES,
} from "../../constants/card-search";
import { FLESHCUBE_RETRY_DELAY_MS } from "../../constants/timing";
import { FAB_DEFAULT_URL } from "../../constants/urls";
import type {
  FabCard,
  FabPrinting,
  FleshcubeCard,
  FleshcubePrinting,
  FleshcubeSearchResponse,
} from "../../interfaces/fleshcube";

let fleshcubeQueue: Promise<unknown> = Promise.resolve();

export function fleshcubeFetch(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  const run = async () => {
    const init = { headers: CARD_API_HEADERS, signal };
    const res = await fetchCardApi(url, init);
    if (res.status < 500) return res;
    await new Promise((resolve) =>
      setTimeout(resolve, FLESHCUBE_RETRY_DELAY_MS),
    );
    return fetchCardApi(url, init);
  };
  const next = fleshcubeQueue.then(run, run);
  fleshcubeQueue = next.catch(() => undefined);
  return next;
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
  const isFoil = printing.foiling !== FAB_STANDARD_FOILING;

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
    searchUrl(baseUrl, 1, FAB_SEARCH_CARD_LIMIT, query),
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
      const foil = FAB_TCGPLAYER_FOIL_NAMES[printing.foiling] ?? "Normal";
      const edition = FAB_TCGPLAYER_EDITION_PREFIXES[printing.edition];
      const subTypes = edition ? [`${edition}${foil}`, foil] : [foil];
      return {
        price: subTypes,
        priceFoil: printing.foiling === FAB_STANDARD_FOILING ? [] : subTypes,
      };
    },
  },
};
