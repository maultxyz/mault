import { and, eq, like } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "../card-search/resolve";
import {
  TCGTRACKING_FALLBACK_ID_PREFIX,
  TCGTRACKING_NEW_SET_WINDOW_MS,
  TCGTRACKING_SET_ALIGNMENT_MIN_FRACTION,
  TCGTRACKING_SET_ALIGNMENT_MIN_SHARED,
} from "../constants/tcgtracking";
import { TCGTRACKING_API_ROOT } from "../constants/urls";
import type {
  CardSearchAdapter,
  FetchOneResult,
  SyncSourceCard,
} from "../interfaces/card-search";
import type {
  TcgtrackingCatalogEntry,
  TcgtrackingFallbackData,
  TcgtrackingGameConfig,
  TcgtrackingPrimaryCard,
  TcgtrackingProduct,
} from "../interfaces/tcgtracking";
import {
  loadTcgtrackingCatalog,
  tcgtrackingCardImage,
  tcgtrackingProductIdOf,
} from "./catalog";
import {
  isTcgtrackingFallbackData,
  toTcgtrackingFallbackSyncCard,
} from "./fallback";
import { TCGTRACKING_GAMES } from "./games";
import {
  baseCardNameKey,
  cardNameKey,
  comparableProductName,
  collectorNumberKey,
  setCodeKey,
} from "./keys";

interface MergeContext {
  config: TcgtrackingGameConfig;
  adapter: CardSearchAdapter;
  catalog: TcgtrackingCatalogEntry[];
  productsById: Map<number, TcgtrackingCatalogEntry>;
  productsByPrimaryCardId: Map<string, TcgtrackingCatalogEntry>;
}

function toPrimaryCard(
  sync: SyncSourceCard,
  context: Pick<MergeContext, "config" | "adapter">,
  lang: string,
): TcgtrackingPrimaryCard | null {
  let card;
  try {
    card = context.adapter.normalizeStored(JSON.parse(sync.data), sync.id, lang);
  } catch {
    return null;
  }
  if (!card) return null;
  const number =
    context.config.numberKeyOf?.(card) ??
    (card.collectorNumber ? collectorNumberKey(card.collectorNumber) : null);
  return {
    id: sync.id,
    card,
    numberKey: number,
    nameKey: cardNameKey(card.name),
    baseNameKey: baseCardNameKey(card.name),
  };
}

function isRecentSet(entry: TcgtrackingCatalogEntry): boolean {
  const publishedAt = Date.parse(entry.set.published_on ?? "");
  return (
    Number.isFinite(publishedAt) &&
    Date.now() - publishedAt <= TCGTRACKING_NEW_SET_WINDOW_MS
  );
}

function productNumberKey(product: TcgtrackingProduct): string | null {
  return product.number ? collectorNumberKey(product.number) : null;
}

function primaryKey(
  config: TcgtrackingGameConfig,
  primary: TcgtrackingPrimaryCard,
): string | null {
  if (!primary.numberKey) return null;
  return config.numbering === "per-set"
    ? `${primary.card.set}|${primary.numberKey}`
    : primary.numberKey;
}

function alignSets(
  config: TcgtrackingGameConfig,
  catalog: TcgtrackingCatalogEntry[],
  primaries: TcgtrackingPrimaryCard[],
): Map<number, string> {
  const setsByPair = new Map<string, Set<string>>();
  for (const primary of primaries) {
    if (!primary.numberKey) continue;
    const pair = `${primary.numberKey}|${primary.nameKey}`;
    setsByPair.set(
      pair,
      (setsByPair.get(pair) ?? new Set()).add(primary.card.set),
    );
  }
  const sharedByGroup = new Map<number, Map<string, number>>();
  const pairCountByGroup = new Map<number, number>();
  for (const { product, set } of catalog) {
    const number = productNumberKey(product);
    if (!number) continue;
    pairCountByGroup.set(set.id, (pairCountByGroup.get(set.id) ?? 0) + 1);
    const primarySets = setsByPair.get(
      `${number}|${cardNameKey(comparableProductName(config, product))}`,
    );
    if (!primarySets) continue;
    const shared = sharedByGroup.get(set.id) ?? new Map<string, number>();
    for (const setCode of primarySets) {
      shared.set(setCode, (shared.get(setCode) ?? 0) + 1);
    }
    sharedByGroup.set(set.id, shared);
  }
  const aligned = new Map<number, string>();
  for (const [groupId, shared] of sharedByGroup) {
    const [setCode, count] = [...shared].sort((a, b) => b[1] - a[1])[0];
    const total = pairCountByGroup.get(groupId) ?? 0;
    if (
      count >= TCGTRACKING_SET_ALIGNMENT_MIN_SHARED &&
      count >= total * TCGTRACKING_SET_ALIGNMENT_MIN_FRACTION
    ) {
      aligned.set(groupId, setCode);
    }
  }
  return aligned;
}

function productKey(
  config: TcgtrackingGameConfig,
  entry: TcgtrackingCatalogEntry,
  alignedSets: Map<number, string>,
): string | null {
  const number = productNumberKey(entry.product);
  if (!number) return null;
  if (config.numbering !== "per-set") return number;
  const setCode = alignedSets.get(entry.set.id);
  return setCode ? `${setCode}|${number}` : null;
}

function existingProductId(
  context: MergeContext,
  primary: TcgtrackingPrimaryCard,
): number | null {
  const id = Number(
    primary.card.tcgplayerId ??
      context.adapter.tcgplayer?.productIdFromRaw?.(primary.card),
  );
  return Number.isInteger(id) && context.productsById.has(id) ? id : null;
}

function pickByKey(
  primary: TcgtrackingPrimaryCard,
  candidates: TcgtrackingCatalogEntry[],
  primariesWithKey: number,
  config: TcgtrackingGameConfig,
): TcgtrackingProduct | null {
  const isBase = config.isBasePrinting?.(primary.card) ?? false;
  if (primariesWithKey > 1 && !isBase) return null;
  const named = candidates.filter(
    (entry) =>
      cardNameKey(comparableProductName(config, entry.product)) ===
      primary.nameKey,
  );
  if (named.length === 1) return named[0].product;
  if (named.length > 1) {
    const setCode = setCodeKey(primary.card.set);
    const inSameSet = named.filter(
      (entry) => setCodeKey(entry.set.abbreviation ?? "") === setCode,
    );
    return inSameSet.length === 1 ? inSameSet[0].product : null;
  }
  return candidates.length === 1 && primariesWithKey === 1
    ? candidates[0].product
    : null;
}

function stampProductId(card: SyncSourceCard, productId: number): SyncSourceCard {
  const fallbackImageUrl = tcgtrackingCardImage(productId).normal;
  return {
    ...card,
    imageUrl: card.imageUrl ?? fallbackImageUrl,
    fallbackImageUrl,
    data: JSON.stringify({
      ...JSON.parse(card.data),
      tcgtrackingProductId: productId,
    }),
  };
}

async function loadStoredFallbacks(
  gameKey: string,
  lang: string,
  onlyCardId?: string,
): Promise<Map<string, TcgtrackingFallbackData>> {
  const rows = await db
    .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        onlyCardId
          ? eq(cardImageVectors.cardId, onlyCardId)
          : like(cardImageVectors.cardId, `${TCGTRACKING_FALLBACK_ID_PREFIX}%`),
      ),
    );
  return new Map(
    rows.flatMap((row) =>
      isTcgtrackingFallbackData(row.data) ? [[row.cardId, row.data]] : [],
    ),
  );
}

async function loadStoredProductId(
  gameKey: string,
  lang: string,
  cardId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        eq(cardImageVectors.cardId, cardId),
      ),
    )
    .limit(1);
  const id = Number(
    (row?.data as { tcgtrackingProductId?: unknown } | null)
      ?.tcgtrackingProductId,
  );
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadContext(
  gameKey: string,
  addLog: (msg: string) => void,
  signal?: AbortSignal,
): Promise<MergeContext | null> {
  const config = TCGTRACKING_GAMES[gameKey];
  const adapter = ADAPTERS_BY_GAME_KEY[gameKey];
  const categoryId = adapter?.tcgplayer?.categoryId;
  if (!config || !adapter || !categoryId) return null;
  const catalog = await loadTcgtrackingCatalog(categoryId, addLog, signal);
  const productsByPrimaryCardId = new Map<string, TcgtrackingCatalogEntry>();
  for (const entry of catalog) {
    const primaryId = config.primaryCardIdOf?.(entry.product);
    if (primaryId) productsByPrimaryCardId.set(primaryId, entry);
  }
  return {
    config,
    adapter,
    catalog,
    productsById: new Map(catalog.map((entry) => [entry.product.id, entry])),
    productsByPrimaryCardId,
  };
}

export async function mergeTcgtrackingCatalog(
  gameKey: string,
  primaryCards: SyncSourceCard[],
  lang: string,
  addLog: (msg: string) => void,
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  if (lang !== "en") return primaryCards;
  const context = await loadContext(gameKey, addLog, signal);
  if (!context || signal?.aborted) return primaryCards;
  const { config, catalog } = context;

  const primaries = primaryCards.map((card) =>
    toPrimaryCard(card, context, lang),
  );
  const knownPrimaries = primaries.filter(
    (primary): primary is TcgtrackingPrimaryCard => primary !== null,
  );
  const alignedSets =
    config.numbering === "per-set"
      ? alignSets(config, catalog, knownPrimaries)
      : new Map<number, string>();

  const productsByKey = new Map<string, TcgtrackingCatalogEntry[]>();
  for (const entry of catalog) {
    const key = productKey(config, entry, alignedSets);
    if (key) productsByKey.set(key, [...(productsByKey.get(key) ?? []), entry]);
  }
  const primaryCountByKey = new Map<string, number>();
  const primaryIdByKey = new Map<string, string>();
  const primaryBaseNames = new Set<string>();
  const primaryBaseNamesBySet = new Map<string, Set<string>>();
  const primaryHighestNumberBySet = new Map<string, number>();
  for (const primary of knownPrimaries) {
    const number = Number(primary.numberKey);
    if (primary.numberKey && Number.isInteger(number)) {
      primaryHighestNumberBySet.set(
        primary.card.set,
        Math.max(primaryHighestNumberBySet.get(primary.card.set) ?? 0, number),
      );
    }
    primaryBaseNames.add(primary.baseNameKey);
    primaryBaseNamesBySet.set(
      primary.card.set,
      (primaryBaseNamesBySet.get(primary.card.set) ?? new Set()).add(
        primary.baseNameKey,
      ),
    );
    const key = primaryKey(config, primary);
    if (!key) continue;
    primaryCountByKey.set(key, (primaryCountByKey.get(key) ?? 0) + 1);
    if (!primaryIdByKey.has(key) || config.isBasePrinting?.(primary.card)) {
      primaryIdByKey.set(key, primary.id);
    }
  }

  const cardIdByProductId = new Map<number, string>();
  const merged = primaryCards.map((card, index) => {
    const primary = primaries[index];
    if (!primary || config.numbering === "name-only") return card;
    const key = primaryKey(config, primary);
    const product =
      context.productsByPrimaryCardId.get(primary.id)?.product ??
      context.productsById.get(existingProductId(context, primary) ?? -1)
        ?.product ??
      (key
        ? pickByKey(
            primary,
            productsByKey.get(key) ?? [],
            primaryCountByKey.get(key) ?? 0,
            config,
          )
        : null);
    if (!product || cardIdByProductId.has(product.id)) return card;
    cardIdByProductId.set(product.id, primary.id);
    return stampProductId(card, product.id);
  });

  const isMissingFromPrimary = (entry: TcgtrackingCatalogEntry): boolean => {
    if (
      config.fallbacks === false ||
      cardIdByProductId.has(entry.product.id) ||
      !entry.product.number
    ) {
      return false;
    }
    const baseName = baseCardNameKey(
      comparableProductName(config, entry.product),
    );
    if (config.numbering === "name-only") {
      return isRecentSet(entry) && !primaryBaseNames.has(baseName);
    }
    const key = productKey(config, entry, alignedSets);
    if (config.numbering === "global") {
      return !!key && !primaryCountByKey.has(key);
    }
    const alignedSet = alignedSets.get(entry.set.id);
    if (!alignedSet) {
      return isRecentSet(entry) && !primaryBaseNames.has(baseName);
    }
    const isPastPrimarySet =
      Number(productNumberKey(entry.product)) >
      (primaryHighestNumberBySet.get(alignedSet) ?? Infinity);
    return (
      !!key &&
      !primaryCountByKey.has(key) &&
      (isPastPrimarySet ||
        !primaryBaseNamesBySet.get(alignedSet)?.has(baseName))
    );
  };

  const fallbacks = catalog
    .filter(isMissingFromPrimary)
    .map((entry) =>
      toTcgtrackingFallbackSyncCard(entry, alignedSets.get(entry.set.id)),
    );
  const fallbackIds = new Set(fallbacks.map((card) => card.id));

  const superseded: SyncSourceCard[] = [];
  for (const [cardId, data] of await loadStoredFallbacks(gameKey, lang)) {
    if (fallbackIds.has(cardId)) continue;
    const entry = context.productsById.get(data.product.id);
    if (!entry) continue;
    const key = productKey(config, entry, alignedSets);
    const supersededByCardId =
      cardIdByProductId.get(data.product.id) ??
      (key ? primaryIdByKey.get(key) : undefined) ??
      "primary";
    const card = toTcgtrackingFallbackSyncCard(entry, data.primarySetCode);
    superseded.push({
      ...card,
      id: cardId,
      data: JSON.stringify({ ...JSON.parse(card.data), supersededByCardId }),
    });
  }

  addLog(
    `TCGTracking: ${cardIdByProductId.size} cards linked to TCGplayer products, ${fallbacks.length} fallback cards added, ${superseded.length} fallback cards superseded${config.numbering === "per-set" ? `, ${alignedSets.size} sets aligned` : ""}.`,
  );
  return [...merged, ...fallbacks, ...superseded];
}

export async function fetchOneWithTcgtracking(
  gameKey: string,
  id: string,
  lang: string,
  fetchPrimary: () => Promise<FetchOneResult>,
): Promise<FetchOneResult> {
  const productId = tcgtrackingProductIdOf(id);
  if (productId === null) {
    const result = await fetchPrimary();
    if (!result.card || lang !== "en") return result;
    const context = await loadContext(gameKey, () => {});
    if (!context) return result;
    const primary = toPrimaryCard({ ...result.card, id }, context, lang);
    const linked =
      (primary &&
        (context.productsByPrimaryCardId.get(id)?.product.id ??
          existingProductId(context, primary))) ||
      (await loadStoredProductId(gameKey, lang, id));
    if (!linked) return result;
    const { id: _id, ...card } = stampProductId({ ...result.card, id }, linked);
    return { ...result, card };
  }

  const urls = [`${TCGTRACKING_API_ROOT}/products/${productId}`];
  const context = await loadContext(gameKey, () => {});
  const entry = context?.productsById.get(productId);
  if (!entry) return { card: null, urls };
  const stored = (await loadStoredFallbacks(gameKey, lang, id)).get(id);
  const fallback = toTcgtrackingFallbackSyncCard(entry, stored?.primarySetCode);
  const { id: _id, ...card } = stored?.supersededByCardId
    ? {
        ...fallback,
        data: JSON.stringify({
          ...JSON.parse(fallback.data),
          supersededByCardId: stored.supersededByCardId,
        }),
      }
    : fallback;
  return { card, urls };
}
