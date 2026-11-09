import type { PlayingCard } from "@magic-vault/shared";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import {
  CARD_API_HEADERS,
  FAB_FALLBACK_TCGPLAYER_SUBTYPES,
  FAB_STANDARD_FOILING,
  FAB_TCGPLAYER_EDITION_PREFIXES,
  FAB_TCGPLAYER_FOIL_NAMES,
} from "../../constants/card-search";
import { FLESHCUBE_RETRY_DELAY_MS } from "../../constants/timing";
import { FAB_DEFAULT_URL } from "../../constants/urls";
import { fabPrintingMarkGroups } from "../../printing-marks/groups";
import type {
  FabCard,
  FabPrinting,
  FleshcubeCard,
  FleshcubePrinting,
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

export const fabAdapter: CardSearchAdapter = {
  defaultUrl: FAB_DEFAULT_URL,
  normalizeStored: (raw, id) => {
    const card = raw as FleshcubeCard;
    const printing = card.cardPrintings.find((p) => p.uniqueId === id);
    return printing ? normalizeFabPrinting(card, printing) : null;
  },
  printingMarkGroups: fabPrintingMarkGroups,
  tcgplayer: {
    categoryId: 62,
    productIdFromRaw: (card) =>
      (card.raw as { printing?: FabPrinting }).printing?.tcgplayer_product_id,
    subTypes: (card) => {
      const { printing } = card.raw as { printing?: FabPrinting };
      if (!printing) return FAB_FALLBACK_TCGPLAYER_SUBTYPES;
      const foil = FAB_TCGPLAYER_FOIL_NAMES[printing.foiling] ?? "Normal";
      const edition = FAB_TCGPLAYER_EDITION_PREFIXES[printing.edition];
      const subTypes = edition ? [`${edition}${foil}`, foil] : [foil];
      return {
        price: subTypes,
        priceFoil: printing.foiling === FAB_STANDARD_FOILING ? [] : subTypes,
      };
    },
  },
  cardmarket: {
    gameId: 16,
    siteGamePath: "FleshAndBlood",
    productNames: (card) => {
      const { card: fabCard } = card.raw as { card: FabCard };
      return fabCard.color
        ? [`${fabCard.name} (${fabCard.color})`, fabCard.name]
        : [fabCard.name];
    },
  },
};
