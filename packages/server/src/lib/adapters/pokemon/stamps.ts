import {
  POKEMON_FIRST_EDITION_STAMP_KEY,
  POKEMON_FIRST_EDITION_SUBTYPES,
  POKEMON_FINISH_SUBTYPES,
  POKEMON_SEPARATE_FINISH_PRODUCT_SUBTYPES,
  POKEMON_STAMP_JOINER,
  POKEMON_STAMP_LABELS,
  POKEMON_STANDARD_VARIANT_SIZE,
} from "../../constants/pokemon";
import type { TcgplayerStampProduct } from "../../interfaces/card-search";
import type { PokemonCardDetail, PokemonCardVariant } from "../../interfaces/pokemon";

function stampKeyLabel(key: string): string {
  return (
    POKEMON_STAMP_LABELS[key] ??
    key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export function pokemonStampLabel(stampKeys: string[]): string {
  return stampKeys.map(stampKeyLabel).join(POKEMON_STAMP_JOINER);
}

function stampedVariants(raw: PokemonCardDetail): PokemonCardVariant[] {
  return (raw.variants_detailed ?? []).filter(
    (variant) =>
      (variant.stamp?.length ?? 0) > 0 &&
      (variant.size ?? POKEMON_STANDARD_VARIANT_SIZE) ===
        POKEMON_STANDARD_VARIANT_SIZE,
  );
}

export function pokemonStamps(raw: PokemonCardDetail): string[] {
  return [
    ...new Set(
      stampedVariants(raw).map((variant) => pokemonStampLabel(variant.stamp!)),
    ),
  ];
}

function stampSubTypes(variant: PokemonCardVariant): string[] {
  const variantType = variant.type ?? "normal";
  if (variant.stamp?.includes(POKEMON_FIRST_EDITION_STAMP_KEY)) {
    return POKEMON_FIRST_EDITION_SUBTYPES[variantType] ?? [];
  }
  return [
    ...(POKEMON_FINISH_SUBTYPES[variantType] ?? []),
    ...POKEMON_SEPARATE_FINISH_PRODUCT_SUBTYPES,
  ];
}

export function pokemonStampProducts(
  raw: PokemonCardDetail,
): TcgplayerStampProduct[] {
  const products = new Map<string, TcgplayerStampProduct>();
  for (const variant of stampedVariants(raw)) {
    const productId = variant.thirdParty?.tcgplayer;
    if (productId == null) continue;
    const stamp = pokemonStampLabel(variant.stamp!);
    const isFoil = variant.type === "holo" || variant.type === "reverse";
    const key = `${stamp}|${isFoil}`;
    if (products.has(key)) continue;
    products.set(key, {
      stamp,
      isFoil,
      productId,
      subTypes: stampSubTypes(variant),
    });
  }
  return [...products.values()];
}
