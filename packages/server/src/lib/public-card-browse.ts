import {
  DEFAULT_PUBLIC_CARD_SORT,
  EMPTY_CARD_FILTERS,
  EMPTY_PUBLIC_CARD_FILTERS,
  PUBLIC_CARDS_PAGE_SIZE,
  PUBLIC_CARDS_PAGE_SIZE_MAX,
  PUBLIC_CARD_PRICE_SORTS,
  PUBLIC_CARDS_SEARCH_MAX_LENGTH,
  PUBLIC_CARD_SORTS,
  publicCardFiltersSchema,
  type OrgPricing,
  type PublicCardDetail,
  type PublicCardPage,
  type PublicCardFacetCount,
  type PublicCardFacets,
  type PublicCardFilters,
  type PublicCardGame,
  type PublicCardSort,
} from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import { cardFilterSql, loadCardStatsForSource } from "../routes/collections/cards-query";
import {
  loadStoredCardsByRowIds,
  toStoredCards,
} from "../routes/storage-locations/shared";
import { cardCatalogJoinSql } from "./card-catalog-sql";
import { cardPricesJoinSql, joinedScannedCardPriceSql } from "./card-price-sql";
import { CC_ALIAS_SQL_COLUMNS } from "./constants/card-prices";
import { PUBLIC_CARD_JOINS, PUBLIC_CARD_LANGUAGE } from "./constants/public-cards";
import {
  INVENTORY_CARD_FILTER,
  STORED_CARD_CATALOG_SCOPE,
} from "./constants/storage-locations";
import type {
  PublicCardBrowseScope,
  PublicCardImageRow,
  PublicCardsRequest,
} from "./interfaces/public-cards";
import { resolveBackScanImageUrl, resolveScanImageUrl } from "./scan-images";
import { pricesForShareLink } from "./share-link-pricing";
import { integerArraySql, pgTextArray } from "./sql-arrays";

function publicCardsWhere(scope: PublicCardBrowseScope, gameKey: string | null = null): SQL {
  return sql`cc.org_id = ${scope.orgId}
    AND (cc.collection_id = ANY(${integerArraySql(scope.collectionIds)})
      OR cc.location_id = ANY(${integerArraySql(scope.storageLocationIds)}))
    ${scope.inventoryOnly ? sql`AND ${INVENTORY_CARD_FILTER}` : sql``}
    ${gameKey ? sql`AND g.key = ${gameKey}` : sql``}`;
}

function parseSort(value: string | undefined, showsPrices: boolean): PublicCardSort {
  const sort = (PUBLIC_CARD_SORTS as readonly string[]).includes(value ?? "")
    ? (value as PublicCardSort)
    : DEFAULT_PUBLIC_CARD_SORT;
  const isPriceSort = (PUBLIC_CARD_PRICE_SORTS as readonly string[]).includes(sort);
  return isPriceSort && !showsPrices ? DEFAULT_PUBLIC_CARD_SORT : sort;
}

function parseFilters(value: string | undefined, showsPrices: boolean): PublicCardFilters {
  if (!value) return EMPTY_PUBLIC_CARD_FILTERS;
  let parsed: PublicCardFilters;
  try {
    const result = publicCardFiltersSchema.safeParse(JSON.parse(value));
    if (!result.success) return EMPTY_PUBLIC_CARD_FILTERS;
    parsed = result.data;
  } catch {
    return EMPTY_PUBLIC_CARD_FILTERS;
  }
  return showsPrices ? parsed : { ...parsed, minPrice: null, maxPrice: null };
}

export function parsePublicCardsRequest(
  query: Record<string, string>,
  showsPrices: boolean,
): PublicCardsRequest {
  return {
    search: (query.search ?? "")
      .toLowerCase()
      .trim()
      .slice(0, PUBLIC_CARDS_SEARCH_MAX_LENGTH),
    sort: parseSort(query.sort, showsPrices),
    gameKey: query.game || null,
    filters: parseFilters(query.filters, showsPrices),
    pageSize: Math.min(
      Math.max(
        Number.parseInt(query.limit ?? "", 10) ||
          PUBLIC_CARDS_PAGE_SIZE,
        1,
      ),
      PUBLIC_CARDS_PAGE_SIZE_MAX,
    ),
    requestedPage: Math.max(Number.parseInt(query.page ?? "", 10) || 1, 1),
  };
}

function cardPriceSql(pricing: OrgPricing): SQL {
  return joinedScannedCardPriceSql(pricing, CC_ALIAS_SQL_COLUMNS, "cp");
}

function cardOrderSql(sort: PublicCardSort, pricing: OrgPricing): SQL {
  if (sort === "name") return sql`cc.card_name COLLATE "und-x-icu" ASC, cc.id ASC`;
  if (sort === "price-desc" || sort === "price-asc") {
    const direction = sort === "price-desc" ? sql`DESC` : sql`ASC`;
    return sql`${cardPriceSql(pricing)} ${direction} NULLS LAST, cc.id ASC`;
  }
  return sql`cc.scanned_at DESC, cc.id DESC`;
}

function publicFiltersSql(request: PublicCardsRequest, pricing: OrgPricing): SQL {
  const { filters } = request;
  const conditions: SQL[] = [
    cardFilterSql({
      search: request.search,
      sort: null,
      grouped: false,
      filters: {
        ...EMPTY_CARD_FILTERS,
        sets: filters.sets,
        rarities: filters.rarities,
        colors: filters.colors,
        foilTypes: filters.foilTypes,
      },
    }),
  ];
  if (filters.conditions.length > 0) {
    conditions.push(sql`cc.condition = ANY(${pgTextArray(filters.conditions)}::text[])`);
  }
  if (filters.languages.length > 0) {
    conditions.push(
      sql`${PUBLIC_CARD_LANGUAGE} = ANY(${pgTextArray(filters.languages)}::text[])`,
    );
  }
  if (filters.finish === "foil") conditions.push(sql`cc.is_foil`);
  if (filters.finish === "nonfoil") conditions.push(sql`NOT cc.is_foil`);
  if (filters.minPrice !== null) {
    conditions.push(sql`${cardPriceSql(pricing)} >= ${filters.minPrice}::float8`);
  }
  if (filters.maxPrice !== null) {
    conditions.push(sql`${cardPriceSql(pricing)} <= ${filters.maxPrice}::float8`);
  }
  return sql.join(conditions, sql` AND `);
}

export async function loadPublicCardIdsPage(
  tx: Transaction,
  scope: PublicCardBrowseScope,
  request: PublicCardsRequest,
  pricing: OrgPricing,
) {
  const { filters } = request;
  const usesPrices =
    request.sort === "price-desc" ||
    request.sort === "price-asc" ||
    filters.minPrice !== null ||
    filters.maxPrice !== null;
  const usesCatalog =
    !!request.search || filters.rarities.length > 0 || filters.colors.length > 0;
  const ranked = sql`
    ranked AS (
      SELECT cc.id, row_number() OVER (ORDER BY ${cardOrderSql(request.sort, pricing)}) AS rn
      FROM collection_cards cc
      ${PUBLIC_CARD_JOINS}
      ${usesCatalog ? cardCatalogJoinSql(STORED_CARD_CATALOG_SCOPE, CC_ALIAS_SQL_COLUMNS) : sql``}
      ${usesPrices ? cardPricesJoinSql("cp", STORED_CARD_CATALOG_SCOPE, CC_ALIAS_SQL_COLUMNS) : sql``}
      WHERE ${publicCardsWhere(scope, request.gameKey)}
        AND ${publicFiltersSql(request, pricing)}
    )`;
  const counted = await tx.execute(sql`
    WITH ${ranked} SELECT count(*)::int AS total FROM ranked
  `);
  const total = Number(
    (counted.rows[0] as unknown as { total: number } | undefined)?.total ?? 0,
  );
  const page = Math.min(
    request.requestedPage,
    Math.max(Math.ceil(total / request.pageSize), 1),
  );
  const result = await tx.execute(sql`
    WITH ${ranked}
    SELECT id FROM ranked ORDER BY rn
    LIMIT ${request.pageSize}::int OFFSET ${(page - 1) * request.pageSize}::int
  `);
  return {
    rowIds: (result.rows as unknown as { id: number }[]).map((row) => Number(row.id)),
    total,
    page,
  };
}

export async function loadPublicCardDetail(
  tx: Transaction,
  scope: PublicCardBrowseScope,
  scanId: string,
): Promise<PublicCardDetail | null> {
  const result = await tx.execute(sql`
    SELECT cc.id,
      cc.captured_image_key, cc.captured_image_data_url,
      cc.captured_back_image_key, cc.captured_back_image_data_url
    FROM collection_cards cc
    ${PUBLIC_CARD_JOINS}
    WHERE cc.guid = ${scanId}::uuid AND ${publicCardsWhere(scope)}
    LIMIT 1
  `);
  const row = result.rows[0] as unknown as PublicCardImageRow | undefined;
  if (!row) return null;
  const [stored] = await toStoredCards(
    await loadStoredCardsByRowIds(tx, [Number(row.id)]),
    false,
  );
  if (!stored) return null;
  const detail: PublicCardDetail = {
    scanId: stored.scanId,
    card: stored.card,
    isFoil: stored.isFoil,
    foilType: stored.foilType,
    stamp: stored.stamp,
    condition: stored.condition,
    language: stored.language,
    scanImageUrl:
      (await resolveScanImageUrl({
        capturedImageKey: row.captured_image_key,
        capturedImageDataUrl: row.captured_image_data_url,
      })) ?? null,
    backScanImageUrl:
      (await resolveBackScanImageUrl({
        capturedBackImageKey: row.captured_back_image_key,
        capturedBackImageDataUrl: row.captured_back_image_data_url,
      })) ?? null,
  };
  return pricesForShareLink(detail, scope.showsPrices);
}

export async function loadPublicCardFacets(
  tx: Transaction,
  scope: PublicCardBrowseScope,
  gameKey: string | null,
  pricing: OrgPricing,
): Promise<PublicCardFacets> {
  const where = publicCardsWhere(scope, gameKey);
  const stats = await loadCardStatsForSource(
    tx,
    { scope: STORED_CARD_CATALOG_SCOPE, joins: PUBLIC_CARD_JOINS, where },
    pricing,
  );
  const result = await tx.execute(sql`
    SELECT
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('key', key, 'count', count) ORDER BY count DESC)
        FROM (SELECT cc.condition AS key, count(*)::int AS count
          FROM collection_cards cc ${PUBLIC_CARD_JOINS}
          WHERE ${where} GROUP BY cc.condition) conditions
      ), '[]'::jsonb) AS conditions,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('key', key, 'count', count) ORDER BY count DESC)
        FROM (SELECT ${PUBLIC_CARD_LANGUAGE} AS key, count(*)::int AS count
          FROM collection_cards cc ${PUBLIC_CARD_JOINS}
          WHERE ${where} GROUP BY 1) languages
      ), '[]'::jsonb) AS languages,
      (SELECT count(*)::int FROM collection_cards cc ${PUBLIC_CARD_JOINS}
        WHERE ${where} AND cc.is_foil) AS foil_count,
      (SELECT count(*)::int FROM collection_cards cc ${PUBLIC_CARD_JOINS}
        WHERE ${where} AND NOT cc.is_foil) AS non_foil_count
  `);
  const row = result.rows[0] as unknown as {
    conditions: PublicCardFacetCount[];
    languages: PublicCardFacetCount[];
    foil_count: number;
    non_foil_count: number;
  };
  return {
    sets: stats.sets
      .map(({ code, name, count }) => ({ code, name, count }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    rarities: stats.rarities,
    colors: stats.colors,
    foilTypes: stats.foilTypes,
    conditions: row.conditions,
    languages: row.languages,
    foilCount: Number(row.foil_count),
    nonFoilCount: Number(row.non_foil_count),
  };
}

export async function loadPublicCardGames(
  tx: Transaction,
  scope: PublicCardBrowseScope,
): Promise<{ cardCount: number; games: PublicCardGame[] }> {
  const result = await tx.execute(sql`
    SELECT g.key, g.name, count(*)::int AS card_count
    FROM collection_cards cc
    ${PUBLIC_CARD_JOINS}
    WHERE ${publicCardsWhere(scope)}
    GROUP BY g.key, g.name
    ORDER BY g.name
  `);
  const rows = result.rows as unknown as {
    key: string | null;
    name: string | null;
    card_count: number;
  }[];
  return {
    cardCount: rows.reduce((sum, row) => sum + Number(row.card_count), 0),
    games: rows.flatMap((row) =>
      row.key && row.name
        ? [{ key: row.key, name: row.name, cardCount: Number(row.card_count) }]
        : [],
    ),
  };
}


export async function loadPublicCardPage(
  tx: Transaction,
  scope: PublicCardBrowseScope,
  request: PublicCardsRequest,
  pricing: OrgPricing,
): Promise<PublicCardPage> {
  const { rowIds, total, page } = await loadPublicCardIdsPage(tx, scope, request, pricing);
  const storedCards = await toStoredCards(await loadStoredCardsByRowIds(tx, rowIds), false);
  const cardPage: PublicCardPage = {
    cards: storedCards.map((stored) => ({
      scanId: stored.scanId,
      card: stored.card,
      isFoil: stored.isFoil,
      foilType: stored.foilType,
      stamp: stored.stamp,
      condition: stored.condition,
      language: stored.language,
    })),
    total,
    page,
    pageSize: request.pageSize,
  };
  return pricesForShareLink(cardPage, scope.showsPrices);
}

export function publicCardReadsKey(
  scope: PublicCardBrowseScope,
  read: string,
  query: Record<string, string>,
): string | null {
  if (!scope.readsCacheKey) return null;
  const parameters = Object.entries(query)
    .filter(([name]) => name !== "token")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  return `${scope.readsCacheKey}|${read}|${parameters}`;
}
