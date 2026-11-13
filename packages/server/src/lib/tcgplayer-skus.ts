import type {
  GroupedEntry,
  PlayingCard,
  TcgplayerSkuMatch,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { tcgplayerPrices, tcgplayerProducts, tcgplayerSkus } from "../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { skuLanguageCode, tcgplayerProductIdOf } from "./card-search/tcgplayer-prices";
import {
  TCGPLAYER_FOIL_VARIANT_PATTERN,
  TCGPLAYER_SKU_CONDITION_COLUMNS,
  TCGPLAYER_SKU_CONDITION_PRICE_COLUMNS,
} from "./constants/tcgtracking";
import type { TcgplayerPricing } from "./interfaces/card-search";
import type { TcgplayerSkuTarget } from "./interfaces/tcgplayer-skus";

function skuTargetFor(
  pricing: TcgplayerPricing,
  entry: GroupedEntry,
): TcgplayerSkuTarget | null {
  const card: PlayingCard = entry.card;
  const condition = entry.condition;
  const languageCode = skuLanguageCode(entry.language);
  if (entry.stamp) {
    const stamped = pricing
      .stampProducts?.(card)
      .find(
        (product) =>
          product.stamp === entry.stamp && product.isFoil === entry.isFoil,
      );
    if (stamped) {
      return {
        productId: stamped.productId,
        variants: stamped.subTypes,
        condition,
        languageCode,
      };
    }
  }
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
  const rowsByProductLanguage = new Map<string, (typeof rows)[number][]>();
  for (const row of rows) {
    const key = `${row.productId}:${row.language}`;
    rowsByProductLanguage.set(key, [...(rowsByProductLanguage.get(key) ?? []), row]);
  }

  const products = await db
    .select({
      productId: tcgplayerProducts.productId,
      name: tcgplayerProducts.name,
      setName: tcgplayerProducts.groupName,
      number: tcgplayerProducts.number,
      rarity: tcgplayerProducts.rarity,
    })
    .from(tcgplayerProducts)
    .where(inArray(tcgplayerProducts.productId, productIds));
  const productsById = new Map(
    products.map(({ productId, ...product }) => [productId, product]),
  );

  const prices = await db
    .select({
      productId: tcgplayerPrices.productId,
      subType: tcgplayerPrices.subType,
      marketPrice: tcgplayerPrices.marketPrice,
      lowPrice: tcgplayerPrices.lowPrice,
    })
    .from(tcgplayerPrices)
    .where(
      and(
        eq(tcgplayerPrices.categoryId, pricing.categoryId),
        inArray(tcgplayerPrices.productId, productIds),
      ),
    );
  const marketPricesByVariant = new Map(
    prices.map((price) => [
      `${price.productId}:${price.subType}`,
      price.marketPrice ?? price.lowPrice,
    ]),
  );

  return targets.map((target) => {
    if (!target) return null;
    const productId = String(target.productId);
    const product = productsById.get(target.productId) ?? null;
    const conditionColumn = TCGPLAYER_SKU_CONDITION_COLUMNS[target.condition];
    const productRows = rowsByProductLanguage.get(`${target.productId}:${target.languageCode}`) ?? [];
    const matchedRow = [
      ...target.variants.flatMap((variant) =>
        productRows.filter((row) => row.variant === variant),
      ),
      ...productRows,
    ].find((row) => row[conditionColumn] != null);
    if (!matchedRow) {
      return {
        productId,
        variant: target.variants[0] ?? null,
        skuId: null,
        isFoilVariant: false,
        marketPrice: null,
        product,
      };
    }
    return {
      productId,
      variant: matchedRow.variant,
      skuId: String(matchedRow[conditionColumn]),
      isFoilVariant: TCGPLAYER_FOIL_VARIANT_PATTERN.test(matchedRow.variant),
      marketPrice:
        matchedRow[TCGPLAYER_SKU_CONDITION_PRICE_COLUMNS[target.condition]] ??
        marketPricesByVariant.get(`${target.productId}:${matchedRow.variant}`) ??
        null,
      product,
    };
  });
}
