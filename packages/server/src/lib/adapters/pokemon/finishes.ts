import type { PlayingCard } from "@magic-vault/shared";
import {
  POKEMON_FINISH_BASE_LABELS,
  POKEMON_FINISH_PATTERN_LABELS,
  POKEMON_FINISH_SUBTYPES,
  POKEMON_SEPARATE_FINISH_PRODUCT_SUBTYPES,
  POKEMON_STANDARD_VARIANT_SIZE,
} from "../../constants/pokemon";
import type { TcgplayerFinishProduct } from "../../interfaces/card-search";
import type {
  PokemonCardDetail,
  PokemonFinish,
  PokemonPricing,
} from "../../interfaces/pokemon";

function patternLabel(pattern: string): string {
  return (
    POKEMON_FINISH_PATTERN_LABELS[pattern] ??
    pattern
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export function pokemonTcgplayerProductId(
  pricing: PokemonPricing | undefined,
): number | null {
  const tcgplayer = pricing?.tcgplayer;
  if (!tcgplayer) return null;
  const preferred =
    tcgplayer.normal?.productId ??
    tcgplayer.holofoil?.productId ??
    tcgplayer["reverse-holofoil"]?.productId;
  if (preferred != null) return preferred;
  for (const value of Object.values(tcgplayer)) {
    if (typeof value === "object" && value?.productId != null) return value.productId;
  }
  return null;
}

function mainProductId(raw: PokemonCardDetail): number | null {
  return (
    raw.variants_detailed?.find((variant) => variant.type === "normal")?.thirdParty
      ?.tcgplayer ??
    pokemonTcgplayerProductId(raw.pricing)
  );
}

export function pokemonFinishes(raw: PokemonCardDetail): PokemonFinish[] {
  const finishes = new Map<string, PokemonFinish>();
  const mainProduct = mainProductId(raw);
  for (const variant of raw.variants_detailed ?? []) {
    const base = variant.type ? POKEMON_FINISH_BASE_LABELS[variant.type] : undefined;
    if (
      !base ||
      variant.stamp?.length ||
      (variant.size ?? POKEMON_STANDARD_VARIANT_SIZE) !== POKEMON_STANDARD_VARIANT_SIZE
    ) {
      continue;
    }
    const productId = variant.thirdParty?.tcgplayer ?? null;
    const isOwnProduct = productId != null && productId !== mainProduct;
    const foilType =
      variant.foil && isOwnProduct ? `${base} (${patternLabel(variant.foil)})` : base;
    if (finishes.has(foilType)) continue;
    finishes.set(foilType, {
      foilType,
      variantType: variant.type!,
      tcgplayerProductId: productId,
    });
  }
  return [...finishes.values()];
}

export function pokemonFinishProducts(card: PlayingCard): TcgplayerFinishProduct[] {
  const mainProductId = Number(card.tcgplayerId);
  return pokemonFinishes(card.raw as PokemonCardDetail).flatMap((finish) =>
    finish.tcgplayerProductId
      ? [
          {
            foilType: finish.foilType,
            productId: finish.tcgplayerProductId,
            subTypes: [
              ...(POKEMON_FINISH_SUBTYPES[finish.variantType] ?? []),
              ...(finish.tcgplayerProductId !== mainProductId
                ? POKEMON_SEPARATE_FINISH_PRODUCT_SUBTYPES
                : []),
            ],
          },
        ]
      : [],
  );
}
