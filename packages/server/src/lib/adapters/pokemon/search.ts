import { pokemonStampProducts, pokemonStamps } from "./stamps";
import { pokemonPrintingMarkGroups } from "../../printing-marks/groups";
import { type PlayingCard, proxiedImageUrl } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { fetchCardApi } from "../../card-search/fetch";
import type { CardSearchAdapter } from "../../interfaces/card-search";
import {
  pokemonFinishes,
  pokemonFinishProducts,
  pokemonFoilOnlyFoilType,
  pokemonTcgplayerProductId,
} from "./finishes";
import { CARD_API_HEADERS } from "../../constants/card-search";
import { POKEMON_FOIL_TYPES_BY_TCGPLAYER_VARIANT } from "../../constants/pokemon";
import { POKEMON_DEFAULT_URL } from "../../constants/urls";
import type {
  PokemonCardDetail,
  PokemonPricing,
} from "../../interfaces/pokemon";

function assetUrl(image: string, quality: "low" | "high"): string {
  return proxiedImageUrl(`${image}/${quality}.webp`);
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

function resolveTcgplayerId(
  pricing: PokemonPricing | undefined,
): string | undefined {
  const productId = pokemonTcgplayerProductId(pricing);
  return productId != null ? String(productId) : undefined;
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
  const foilTypes = pokemonFinishes(raw).map((finish) => finish.foilType);
  const stamps = pokemonStamps(raw);
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
    tcgplayerId: resolveTcgplayerId(raw.pricing),
    foilTypes: foilTypes.length > 0 ? foilTypes : undefined,
    foilOnlyFoilType: pokemonFoilOnlyFoilType(raw, foilTypes),
    stamps: stamps.length > 0 ? stamps : undefined,
    cmc: raw.retreat,
    raw,
  };
}

export async function fetchDetail(
  id: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<PokemonCardDetail | null> {
  const response = await fetchCardApi(`${baseUrl}/${id}`, {
    headers: CARD_API_HEADERS,
    signal,
  });
  if (!response.ok) return null;
  return (await response.json()) as PokemonCardDetail;
}

export const pokemonAdapter: CardSearchAdapter = {
  defaultUrl: POKEMON_DEFAULT_URL,
  urlForLang,
  normalizeStored: (raw) => normalizePokemonCard(raw as PokemonCardDetail),
  excludedFromMatchingSql: sql`(data->>'image') LIKE '%/tcgp/%'`,
  printedSetTotalSql: sql`CASE WHEN data->'set'->'cardCount'->>'official' ~ '^[0-9]+$' THEN (data->'set'->'cardCount'->>'official')::int END`,
  printingMarkGroups: pokemonPrintingMarkGroups,
  tcgplayer: {
    categoryId: 3,
    foilTypeOfVariant: (variant) =>
      POKEMON_FOIL_TYPES_BY_TCGPLAYER_VARIANT[variant] ?? variant,
    productIdFromRaw: (card) =>
      resolveTcgplayerId((card.raw as PokemonCardDetail).pricing),
    finishProducts: pokemonFinishProducts,
    stampProducts: (card) => pokemonStampProducts(card.raw as PokemonCardDetail),
    subTypes: () => ({
      price: [
        "Normal",
        "Unlimited",
        "Holofoil",
        "Unlimited Holofoil",
        "1st Edition",
        "1st Edition Holofoil",
      ],
      priceFoil: [
        "Holofoil",
        "Reverse Holofoil",
        "Unlimited Holofoil",
        "1st Edition Holofoil",
      ],
    }),
  },
  cardmarket: {
    gameId: 6,
    siteGamePath: "Pokemon",
    productIdFromRaw: (card) =>
      (card.raw as PokemonCardDetail).pricing?.cardmarket?.idProduct,
  },
};
