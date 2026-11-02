import type {
  GroupedEntry,
  PlayingCard,
  TcgplayerSkuMatch,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { tcgplayerProducts, tcgplayerSkus } from "../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { tcgplayerProductIdOf } from "./card-search/tcgplayer-prices";
import {
  TCGPLAYER_SKU_CONDITION_COLUMNS,
  TCGTRACKING_SKU_LANGUAGE_CODES,
} from "./constants/tcgtracking";
import type { TcgplayerPricing } from "./interfaces/card-search";
import type { TcgplayerSkuTarget } from "./interfaces/tcgplayer-skus";

function skuLanguageCode(language: string): string {
  const normalized = language.toLowerCase();
  return TCGTRACKING_SKU_LANGUAGE_CODES[normalized] ?? normalized.toUpperCase();
}

function skuTargetFor(
  pricing: TcgplayerPricing,
  entry: GroupedEntry,
): TcgplayerSkuTarget | null {
  const card: PlayingCard = entry.card;
  const condition = entry.condition;
  const languageCode = skuLanguageCode(entry.language);
  if (entry.isFoil && entry.foilType) {
    const finish = pricing
      .finishProducts?.(card)
      .find((product) => product.foilType === entry.foilType);
    if (finish) {
      return { productId: finish.productId, variants: finish.subTypes, condition, languageCode };
    }
  }
  const productId = tcgplayerProductIdOf(pricing, card);
  if (productId === null) return null;
  const subTypes = pricing.subTypes(card);
  const variants =
    entry.isFoil && subTypes.priceFoil.length > 0
      ? subTypes.priceFoil
      : subTypes.price;
  return { productId, variants, condition, languageCode };
}

export async function resolveTcgplayerSkus(
  gameKey: string | undefined,
  entries: GroupedEntry[],
): Promise<(TcgplayerSkuMatch | null)[]> {
  const pricing = gameKey ? ADAPTERS_BY_GAME_KEY[gameKey]?.tcgplayer : undefined;
  if (!pricing) return entries.map(() => null);

  const targets = entries.map((entry) => skuTargetFor(pricing, entry));
  const productIds = [
    ...new Set(targets.flatMap((target) => (target ? [target.productId] : []))),
  ];
  if (productIds.length === 0) return entries.map(() => null);

  const rows = await db
    .select()
    .from(tcgplayerSkus)
    .where(
      and(
        eq(tcgplayerSkus.categoryId, pricing.categoryId),
        inArray(tcgplayerSkus.productId, productIds),
      ),
    );
  const rowsByKey = new Map(
    rows.map((row) => [`${row.productId}:${row.variant}:${row.language}`, row]),
  );
  const products = await db
    .select({ productId: tcgplayerProducts.productId, name: tcgplayerProducts.name })
    .from(tcgplayerProducts)
    .where(inArray(tcgplayerProducts.productId, productIds));
  const productNamesById = new Map(
    products.map((product) => [product.productId, product.name]),
  );

  return targets.map((target) => {
    if (!target) return null;
    const productId = String(target.productId);
    const productName = productNamesById.get(target.productId) ?? null;
    for (const variant of target.variants) {
      const row = rowsByKey.get(`${target.productId}:${variant}:${target.languageCode}`);
      const skuId = row?.[TCGPLAYER_SKU_CONDITION_COLUMNS[target.condition]];
      if (skuId != null) return { productId, variant, skuId: String(skuId), productName };
    }
    return { productId, variant: target.variants[0] ?? null, skuId: null, productName };
  });
}
