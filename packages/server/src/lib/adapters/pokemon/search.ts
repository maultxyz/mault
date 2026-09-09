import type { PlayingCard, Result } from "@magic-vault/shared";
import { CARD_API_HEADERS } from "../card-search/constants";
import { fetchCardApi } from "../card-search/fetch";
import type { CardSearchAdapter } from "../card-search/types";
import { validateQuery } from "../card-search/validate";

export const POKEMON_DEFAULT_URL = "https://api.eu1.tcgdex.net/v2/en/cards";

interface PokemonCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface PokemonAttack {
  name: string;
  cost?: string[];
  damage?: string | number;
  effect?: string;
}

interface PokemonAbility {
  type?: string;
  name: string;
  effect?: string;
}

interface PokemonPricing {
  tcgplayer?: {
    normal?: { marketPrice?: number };
    holofoil?: { marketPrice?: number };
    "reverse-holofoil"?: { marketPrice?: number };
  };
}

interface PokemonCardDetail extends PokemonCardBrief {
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  description?: string;
  stage?: string;
  trainerType?: string;
  energyType?: string;
  effect?: string;
  attacks?: PokemonAttack[];
  abilities?: PokemonAbility[];
  retreat?: number;
  pricing?: PokemonPricing;
  set?: {
    id: string;
    name: string;
  };
  legal?: {
    standard?: boolean;
  };
}

function assetUrl(image: string, quality: "low" | "high"): string {
  return `/api/cards/image-proxy?url=${encodeURIComponent(`${image}/${quality}.webp`)}`;
}

function urlForLang(lang: string): string {
  return POKEMON_DEFAULT_URL.replace(/\/v2\/[^/]+\//, `/v2/${lang}/`);
}

function resolvePrice(pricing: PokemonPricing | undefined): number | null {
  return pricing?.tcgplayer?.normal?.marketPrice ?? null;
}

function resolveFoilPrice(pricing: PokemonPricing | undefined): number | null {
  return (
    pricing?.tcgplayer?.holofoil?.marketPrice ??
    pricing?.tcgplayer?.["reverse-holofoil"]?.marketPrice ??
    null
  );
}

function normalizePokemonCard(raw: PokemonCardDetail): PlayingCard {
  const small = raw.image ? assetUrl(raw.image, "low") : "";
  const large = raw.image ? assetUrl(raw.image, "high") : "";
  const attackText = (raw.attacks ?? [])
    .map((a) =>
      [a.name, a.damage != null ? `(${a.damage})` : "", a.effect]
        .filter(Boolean)
        .join(" "),
    )
    .join("\n");
  const abilityText = (raw.abilities ?? [])
    .map((a) => [a.name, a.effect].filter(Boolean).join(": "))
    .join("\n");
  const text =
    [raw.effect, raw.description, abilityText, attackText]
      .filter(Boolean)
      .join("\n\n") || undefined;
  const typeLine =
    [raw.category, raw.stage ?? raw.trainerType ?? raw.energyType]
      .filter(Boolean)
      .join(" - ") ||
    (raw.category ?? "");

  return {
    id: raw.id,
    name: raw.name ?? "",
    image: large ? { small: small || large, normal: large } : null,
    set: raw.set?.id ?? "",
    setName: raw.set?.name || (raw.set?.id ?? ""),
    collectorNumber: raw.localId ?? "",
    rarity: (raw.rarity ?? "").toLowerCase(),
    typeLine,
    text,
    power: undefined,
    toughness: raw.hp != null ? String(raw.hp) : undefined,
    colorIdentity: raw.types ?? [],
    artist: raw.illustrator ?? undefined,
    price: resolvePrice(raw.pricing),
    priceFoil: resolveFoilPrice(raw.pricing),
    sourceUrl: `https://tcgdex.dev/cards/${raw.id}`,
    cmc: raw.retreat,
    raw,
  };
}

async function fetchDetail(
  id: string,
  baseUrl: string,
): Promise<PokemonCardDetail | null> {
  const response = await fetchCardApi(`${baseUrl}/${id}`, {
    headers: CARD_API_HEADERS,
  });
  if (!response.ok) return null;
  return (await response.json()) as PokemonCardDetail;
}

// Cap on how many brief search hits get enriched with a full detail fetch.
// TCGdex's list endpoint only returns {id, localId, name, image} - the picker
// UI needs set/rarity/collector number too, so each result needs its own
// /cards/:id call. Keeping this modest bounds the fan-out on every keystroke.
const MAX_ENRICHED_RESULTS = 30;

export async function Search(
  query: string,
  baseUrl: string = POKEMON_DEFAULT_URL,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const url = `${baseUrl}?name=${encodeURIComponent(query)}&pagination:itemsPerPage=${MAX_ENRICHED_RESULTS}`;
  const response = await fetchCardApi(url, { headers: CARD_API_HEADERS });

  if (!response.ok) {
    return {
      message: "Failed to fetch from the TCGdex Pokémon API.",
      success: false,
    };
  }

  const briefs = (await response.json()) as PokemonCardBrief[];
  if (briefs.length === 0) {
    return {
      message: `No cards were found with the query: ${query}`,
      success: false,
    };
  }

  const details = await Promise.all(
    briefs.map((b) => fetchDetail(b.id, baseUrl)),
  );

  return {
    message: "Cards successfully retrieved.",
    data: details
      .filter((d): d is PokemonCardDetail => d !== null)
      .map(normalizePokemonCard),
    success: true,
  };
}

export async function SearchById(
  id: string,
  baseUrl: string = POKEMON_DEFAULT_URL,
): Promise<Result<PlayingCard>> {
  const raw = await fetchDetail(id, baseUrl);
  if (!raw) {
    return {
      success: false,
      message: `TCGdex API error: card ${id} not found.`,
    };
  }

  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: normalizePokemonCard(raw),
  };
}

export const pokemonAdapter: CardSearchAdapter = {
  defaultUrl: POKEMON_DEFAULT_URL,
  urlForLang,
  search: Search,
  searchById: SearchById,
};
