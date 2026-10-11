import type { PlayingCard, Result } from "@magic-vault/shared";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import { validateQuery } from "../../card-search/validate";
import {
  CARD_API_HEADERS,
  GRAND_ARCHIVE_PROMO_RARITIES,
  GRAND_ARCHIVE_RARITY_NAMES,
  GRAND_ARCHIVE_SEARCH_PAGE_SIZE,
} from "../../constants/card-search";
import {
  GRAND_ARCHIVE_API_ROOT,
  GRAND_ARCHIVE_DEFAULT_URL,
  GRAND_ARCHIVE_INDEX_URL,
} from "../../constants/urls";
import type {
  GrandArchiveCard,
  GrandArchiveEdition,
  GrandArchiveSearchResponse,
} from "../../interfaces/grand-archive";

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, sep: string, ch: string) => sep + ch.toUpperCase(),
    );
}

function matchName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function withoutEditions(
  card: GrandArchiveCard,
): Omit<GrandArchiveCard, "editions"> {
  const copy: Partial<GrandArchiveCard> = { ...card };
  delete copy.editions;
  return copy as Omit<GrandArchiveCard, "editions">;
}

export function grandArchiveSearchUrl(
  baseUrl: string,
  params: Record<string, string | number>,
): string {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );
  return `${baseUrl}/search?${query}`;
}

export function normalizeGrandArchiveEdition(
  source: GrandArchiveCard,
  edition: GrandArchiveEdition,
): PlayingCard {
  const card = withoutEditions(source);
  const image = edition.image
    ? `${GRAND_ARCHIVE_API_ROOT}${edition.image}`
    : null;
  const types = card.types.map(titleCase).join(" ");
  const subtypes = card.subtypes.map(titleCase).join(" ");
  const toughness = card.life ?? card.durability;

  return {
    id: edition.slug,
    name: card.name,
    image: image ? { small: image, normal: image } : null,
    set: edition.set.prefix,
    setName: edition.set.name,
    collectorNumber: edition.collector_number,
    rarity: (GRAND_ARCHIVE_RARITY_NAMES[edition.rarity] ?? "").toLowerCase(),
    typeLine: subtypes ? `${types} - ${subtypes}` : types,
    text: edition.effect_raw || card.effect_raw || undefined,
    power: card.power != null ? String(card.power) : undefined,
    toughness: toughness != null ? String(toughness) : undefined,
    colorIdentity: card.elements.map(titleCase),
    artist: edition.illustrator || undefined,
    price: null,
    priceFoil: null,
    sourceUrl: `${GRAND_ARCHIVE_INDEX_URL}/edition/${edition.slug}`,
    cmc: card.cost_memory ?? card.cost_reserve ?? undefined,
    raw: { card, edition },
  };
}

export function findGrandArchiveEdition(
  card: GrandArchiveCard,
  slug: string,
): GrandArchiveEdition | undefined {
  return card.editions.find((edition) => edition.slug === slug);
}

export async function fetchCardByEditionSlug(
  slug: string,
  baseUrl: string,
): Promise<{ card: GrandArchiveCard | null; url: string; status: number }> {
  const url = grandArchiveSearchUrl(baseUrl, { edition_slug: slug });
  const res = await fetchCardApi(url, { headers: CARD_API_HEADERS });
  if (!res.ok) return { card: null, url, status: res.status };
  const json = (await res.json()) as GrandArchiveSearchResponse;
  const card = json.data.find((c) => findGrandArchiveEdition(c, slug)) ?? null;
  return { card, url, status: res.status };
}

export async function Search(
  query: string,
  baseUrl: string = GRAND_ARCHIVE_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const response = await fetchCardApi(
    grandArchiveSearchUrl(baseUrl, {
      name: query,
      page_size: GRAND_ARCHIVE_SEARCH_PAGE_SIZE,
    }),
    { headers: CARD_API_HEADERS },
  );

  if (!response.ok) {
    return {
      message: "Failed to fetch from the Grand Archive API.",
      success: false,
    };
  }

  const json = (await response.json()) as GrandArchiveSearchResponse;
  const cards = json.data.flatMap((card) =>
    card.editions.map((edition) => normalizeGrandArchiveEdition(card, edition)),
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
  baseUrl: string = GRAND_ARCHIVE_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const { card, status } = await fetchCardByEditionSlug(id, baseUrl);
  const edition = card && findGrandArchiveEdition(card, id);
  if (!card || !edition) {
    return {
      success: false,
      message: `Grand Archive API error: ${status} for card ${id}`,
    };
  }

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizeGrandArchiveEdition(card, edition),
  };
}

export const grandArchiveAdapter: CardSearchAdapter = {
  defaultUrl: GRAND_ARCHIVE_DEFAULT_URL,
  search: Search,
  searchById: SearchById,
  normalizeStored: (raw, id) => {
    const card = raw as GrandArchiveCard;
    const edition = findGrandArchiveEdition(card, id);
    return edition ? normalizeGrandArchiveEdition(card, edition) : null;
  },
  tcgplayer: {
    categoryId: 74,
    subTypes: () => ({ price: ["Normal", "Foil"], priceFoil: ["Foil"] }),
    productMatch: (card) => {
      const { card: source, edition } = card.raw as {
        card: Omit<GrandArchiveCard, "editions">;
        edition: GrandArchiveEdition;
      };
      const name = matchName(source.name);
      const rarity = GRAND_ARCHIVE_RARITY_NAMES[edition.rarity];
      const anyRarity = GRAND_ARCHIVE_PROMO_RARITIES.has(edition.rarity);
      return {
        numbers: [edition.collector_number],
        accepts: (product) =>
          matchName(product.name) === name &&
          (anyRarity || !product.rarity || product.rarity === rarity),
      };
    },
  },
};
