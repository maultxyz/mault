import { TCGTRACKING_EXT_KEYS } from "../../constants/tcgtracking";
import {
  YUGIOH_DATE_REPRINT_SET_NAME_PATTERN,
  YUGIOH_MISSING_PRODUCT_NUMBER,
  YUGIOH_PRINTING_ONLY_KEYS,
} from "../../constants/yugioh";
import type {
  TcgtrackingCatalogSet,
  TcgtrackingPrimaryShapedFieldsInput,
  TcgtrackingProduct,
} from "../../interfaces/tcgtracking";
import type { YgoCardSet } from "../../interfaces/yugioh";
import { extText } from "../../tcgtracking/fallback";
import { yugiohPrintingKey } from "./printings";

export function yugiohProductPrintingKey(
  product: TcgtrackingProduct,
  _setProducts: TcgtrackingProduct[],
  set: TcgtrackingCatalogSet,
): string | null {
  const number = product.number?.trim();
  if (!number || number.toUpperCase() === YUGIOH_MISSING_PRODUCT_NUMBER) return null;
  if (YUGIOH_DATE_REPRINT_SET_NAME_PATTERN.test(set.name)) return null;
  return yugiohPrintingKey(number, product.rarity);
}

function numericExt(ext: Record<string, unknown>, keys: readonly string[]): number | undefined {
  const value = Number(extText(ext, keys));
  return Number.isFinite(value) ? value : undefined;
}

function withoutPrintingOnlyKeys(data: Record<string, unknown>): Record<string, unknown> {
  const kept = { ...data };
  for (const key of YUGIOH_PRINTING_ONLY_KEYS) delete kept[key];
  return kept;
}

export function yugiohPrimaryShape({
  name,
  product,
  ext,
  tcgtrackingSetName,
  sameNamePrimaryCard,
}: TcgtrackingPrimaryShapedFieldsInput): Record<string, unknown> {
  const printing: YgoCardSet = {
    set_name: tcgtrackingSetName,
    set_code: product.number?.trim() ?? "",
    set_rarity: product.rarity ?? "",
  };
  const productFields = {
    type: extText(ext, TCGTRACKING_EXT_KEYS.type),
    race: extText(ext, TCGTRACKING_EXT_KEYS.yugiohMonsterType),
    attribute: extText(ext, TCGTRACKING_EXT_KEYS.yugiohAttribute),
    atk: numericExt(ext, TCGTRACKING_EXT_KEYS.yugiohAttack),
    def: numericExt(ext, TCGTRACKING_EXT_KEYS.yugiohDefense),
    desc: extText(ext, TCGTRACKING_EXT_KEYS.text),
  };
  return {
    ...Object.fromEntries(
      Object.entries(productFields).filter(([, value]) => value !== undefined),
    ),
    ...(sameNamePrimaryCard
      ? withoutPrintingOnlyKeys(sameNamePrimaryCard.data)
      : {}),
    name: sameNamePrimaryCard?.name ?? name,
    card_sets: [printing],
  };
}
