import {
  SORCERY_BASE_PRODUCT,
  SORCERY_FOIL_TYPE,
  SORCERY_PRODUCT_BY_TCGPLAYER_VARIANT,
  SORCERY_TCGPLAYER_FOIL_VARIANT,
  SORCERY_TCGPLAYER_VARIANT_SUFFIX_PATTERN,
} from "../../constants/sorcery";
import type { SorceryCard, SorceryTcgplayerProductName } from "../../interfaces/sorcery";
import type {
  TcgtrackingFinishProduct,
  TcgtrackingProduct,
} from "../../interfaces/tcgtracking";
import { cardNameKey } from "../../tcgtracking/keys";

const parsedProductNames = new WeakMap<TcgtrackingProduct, SorceryTcgplayerProductName>();

export function parseSorceryTcgplayerProductName(name: string): SorceryTcgplayerProductName {
  const variants: string[] = [];
  let baseName = name.trim();
  for (
    let match = SORCERY_TCGPLAYER_VARIANT_SUFFIX_PATTERN.exec(baseName);
    match;
    match = SORCERY_TCGPLAYER_VARIANT_SUFFIX_PATTERN.exec(baseName)
  ) {
    variants.unshift(match[1].trim());
    baseName = baseName.slice(0, match.index).trim();
  }
  const otherVariants = variants.filter(
    (variant) => variant !== SORCERY_TCGPLAYER_FOIL_VARIANT,
  );
  return {
    baseName,
    variant: otherVariants.length ? otherVariants.join(" ") : null,
    isFoil: otherVariants.length !== variants.length,
  };
}

function parsedNameOf(product: TcgtrackingProduct): SorceryTcgplayerProductName {
  const cached = parsedProductNames.get(product);
  if (cached) return cached;
  const parsed = parseSorceryTcgplayerProductName(product.name);
  parsedProductNames.set(product, parsed);
  return parsed;
}

function artworkKey(name: string, product: string): string {
  return `${cardNameKey(name)}|${product}`;
}

function productArtworkKey(parsed: SorceryTcgplayerProductName): string | null {
  const product = parsed.variant
    ? SORCERY_PRODUCT_BY_TCGPLAYER_VARIANT[parsed.variant]
    : SORCERY_BASE_PRODUCT;
  return product ? artworkKey(parsed.baseName, product) : null;
}

export function sorceryPrimaryArtworkKey(raw: SorceryCard): string {
  return artworkKey(raw.name, raw.printings[0].meta.product);
}

export function sorceryProductArtworkKey(
  product: TcgtrackingProduct,
  setProducts: TcgtrackingProduct[],
): string | null {
  const parsed = parsedNameOf(product);
  const key = productArtworkKey(parsed);
  if (!key || !parsed.isFoil) return key;
  const hasNonFoilProduct = setProducts.some((sibling) => {
    const siblingName = parsedNameOf(sibling);
    return !siblingName.isFoil && productArtworkKey(siblingName) === key;
  });
  return hasNonFoilProduct ? null : key;
}

export function sorceryFoilProducts(
  product: TcgtrackingProduct,
  setProducts: TcgtrackingProduct[],
): TcgtrackingFinishProduct[] {
  const parsed = parsedNameOf(product);
  const key = productArtworkKey(parsed);
  if (!key || parsed.isFoil) return [];
  return setProducts
    .filter((sibling) => {
      const siblingName = parsedNameOf(sibling);
      return siblingName.isFoil && productArtworkKey(siblingName) === key;
    })
    .map((sibling) => ({ foilType: SORCERY_FOIL_TYPE, productId: sibling.id }));
}

export function sorceryComparableProductName(name: string): string {
  return parseSorceryTcgplayerProductName(name).baseName;
}
