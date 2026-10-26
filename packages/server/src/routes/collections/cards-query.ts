import {
  DEFAULT_CARD_SORT,
  EMPTY_CARD_FILTERS,
  type BinWindow,
  type CardFilters,
  type CardStatsAggregate,
  type CollectionCardsQuery,
  type FieldMeta,
  type GroupedScannedCard,
  type OrgPricing,
  type ScannedCard,
  SORTABLE_FIELD_TYPES,
} from "@magic-vault/shared";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Transaction } from "../../db";
import { collections, games } from "../../db/schema";
import { toScannedCard } from "./shared";
import type {
  CardsCollection,
  CollectionCardRow,
} from "../../lib/interfaces/collections";
import { UUID_PATTERN } from "../../lib/constants/validation";
import {
  CARD_SEARCH_FIELDS,
  NUMERIC_PREFIX_SQL_PATTERN,
} from "../../lib/constants/collections";
import {
  CARD_PRICE_COLUMNS,
  CARD_PRICE_DETAIL_KEYS,
  CC_ALIAS_SQL_COLUMNS,
} from "../../lib/constants/card-prices";
import {
  cardPricesJoinSql,
  joinedCardPricesJsonSql,
  joinedScannedCardPriceSql,
} from "../../lib/card-price-sql";
import type {
  CardPriceDetailKey,
  CardPriceKey,
} from "../../lib/interfaces/card-prices";

const cardFiltersSchema = z.object({
  colors: z.array(z.string()).default([]),
  rarities: z.array(z.string()).default([]),
  bins: z.array(z.number().int().nullable()).default([]),
  needsAttention: z.boolean().default(false),
  showDownloaded: z.boolean().default(false),
  sets: z.array(z.string()).default([]),
  minMatchPercent: z.number().min(0).max(100).default(0),
  foilTypes: z.array(z.string()).default([]),
});

const binWindowsSchema = z.array(
  z.object({
    binNumber: z.number().int(),
    lastEmptiedAt: z.number().nullable(),
  }),
);

function parseJsonParam<T>(
  value: string | undefined,
  schema: z.ZodType<T>,
): T | null {
  if (!value) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parseCardsQuery(
  params: Record<string, string | undefined>,
): CollectionCardsQuery {
  const filters: CardFilters =
    parseJsonParam(params.filters, cardFiltersSchema) ?? EMPTY_CARD_FILTERS;
  return {
    search: (params.search ?? "").toLowerCase().trim(),
    sort: params.sort || null,
    filters,
    grouped: params.grouped === "1",
    unreviewed: params.unreviewed === "1",
  };
}

export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(page) && page > 0 ? page : 0;
}

export function parseBinWindows(value: string | undefined): BinWindow[] {
  return parseJsonParam(value, binWindowsSchema) ?? [];
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function findCardsCollection(
  tx: Transaction,
  guid: string,
  orgId: string,
): Promise<CardsCollection | null> {
  if (!isUuid(guid)) return null;
  const [collection] = await tx
    .select({
      id: collections.id,
      gameKey: games.key,
      lang: collections.lang,
      fieldDefinitions: games.fieldDefinitions,
    })
    .from(collections)
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(
      and(
        eq(collections.guid, guid),
        eq(collections.orgId, orgId),
        eq(collections.isDeleted, false),
      ),
    )
    .limit(1);
  if (!collection) return null;
  return {
    id: collection.id,
    gameKey: collection.gameKey,
    lang: collection.lang,
    fieldDefinitions: (collection.fieldDefinitions as FieldMeta[] | null) ?? [],
  };
}

function pgTextArray(values: string[]): string {
  const quoted = values.map(
    (v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
  return `{${quoted.join(",")}}`;
}

function jsonNumber(key: string): SQL {
  return sql`(CASE WHEN jsonb_typeof(cc.card -> ${key}::text) = 'number' THEN (cc.card ->> ${key}::text)::float8 END)`;
}

const COLOR_IDENTITY = sql`(CASE WHEN jsonb_typeof(cc.card -> 'colorIdentity') = 'array' THEN cc.card -> 'colorIdentity' ELSE '[]'::jsonb END)`;

const FOIL_LABEL = sql`COALESCE(cc.foil_type, CASE WHEN cc.is_foil THEN 'Foil' END)`;

const DUPLICATE_KEY = sql`(cc.card_id || ':' || cc.is_foil::text || ':' || COALESCE(cc.foil_type, '') || ':' || cc.condition)`;

function isCardPriceKey(path: string): path is CardPriceKey {
  return path in CARD_PRICE_COLUMNS;
}

function isCardPriceDetailKey(key: string): key is CardPriceDetailKey {
  return (CARD_PRICE_DETAIL_KEYS as readonly string[]).includes(key);
}

const STORAGE_LOCATION_JOIN = sql`LEFT JOIN storage_locations sl ON sl.id = cc.location_id AND NOT sl.is_deleted`;

const SCANNED_AT_MS = sql`(extract(epoch from cc.scanned_at) * 1000)::float8`;

function fieldValueSql(path: string): SQL {
  const segments = path.split(".");
  const saved = sql`COALESCE(cc.card #> ${pgTextArray(["raw", ...segments])}::text[], cc.card #> ${pgTextArray(segments)}::text[])`;
  if (isCardPriceKey(path)) {
    return sql`COALESCE(to_jsonb(${sql.raw(`cp.${CARD_PRICE_COLUMNS[path]}`)}), ${saved})`;
  }
  if (isCardPriceDetailKey(segments[0])) {
    return sql`COALESCE(cp.details #> ${pgTextArray(segments)}::text[], ${saved})`;
  }
  return saved;
}

function anyOf(values: string[]): SQL {
  return sql`ANY(${pgTextArray(values)}::text[])`;
}

export function cardFilterSql(
  { filters, search, unreviewed }: CollectionCardsQuery,
  keepScanId?: string,
): SQL {
  const conditions: SQL[] = [];

  if (unreviewed) {
    conditions.push(
      keepScanId
        ? sql`(NOT cc.is_reviewed OR cc.guid = ${keepScanId}::uuid)`
        : sql`NOT cc.is_reviewed`,
    );
  }

  if (filters.colors.length > 0) {
    const named = filters.colors.filter((c) => c !== "C");
    const parts: SQL[] = [];
    if (filters.colors.includes("C")) {
      parts.push(sql`jsonb_array_length(${COLOR_IDENTITY}) = 0`);
    }
    if (named.length > 0) {
      parts.push(
        sql`jsonb_exists_any(${COLOR_IDENTITY}, ${pgTextArray(named)}::text[])`,
      );
    }
    conditions.push(sql`(${sql.join(parts, sql` OR `)})`);
  }

  if (filters.rarities.length > 0) {
    conditions.push(sql`cc.card ->> 'rarity' = ${anyOf(filters.rarities)}`);
  }

  if (filters.bins.length > 0) {
    const numbered = filters.bins.filter((b): b is number => b !== null);
    const parts: SQL[] = [];
    if (filters.bins.includes(null)) parts.push(sql`cc.bin_number IS NULL`);
    if (numbered.length > 0) {
      parts.push(sql`cc.bin_number = ANY(${`{${numbered.join(",")}}`}::int[])`);
    }
    conditions.push(sql`(${sql.join(parts, sql` OR `)})`);
  }

  if (filters.needsAttention) {
    const needsAttention = sql`((jsonb_typeof(cc.alternative_matches) = 'array' AND jsonb_array_length(cc.alternative_matches) > 0) OR cc.low_confidence_match) AND NOT cc.is_corrected`;
    conditions.push(
      keepScanId
        ? sql`((${needsAttention}) OR cc.guid = ${keepScanId}::uuid)`
        : needsAttention,
    );
  }

  if (!filters.showDownloaded) {
    conditions.push(sql`NOT cc.is_downloaded`);
  }

  if (filters.sets.length > 0) {
    conditions.push(sql`cc.card ->> 'set' = ${anyOf(filters.sets)}`);
  }

  if (filters.foilTypes.length > 0) {
    conditions.push(sql`${FOIL_LABEL} = ${anyOf(filters.foilTypes)}`);
  }

  if (filters.minMatchPercent > 0) {
    conditions.push(
      sql`LEAST(100, GREATEST(0, COALESCE(${jsonNumber("confidence")}, 1 - ${jsonNumber("distance")}) * 100)) >= ${filters.minMatchPercent}::float8`,
    );
  }

  if (search) {
    const matches = CARD_SEARCH_FIELDS.map(
      (key) =>
        sql`strpos(lower(COALESCE(cc.card ->> ${key}::text, '')), ${search}::text) > 0`,
    );
    conditions.push(sql`(${sql.join(matches, sql` OR `)})`);
  }

  return conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`;
}

function sortField(
  sort: string | null,
  fieldDefinitions: FieldMeta[],
): { meta: FieldMeta; dir: "asc" | "desc" } | null {
  if (!sort || sort === DEFAULT_CARD_SORT) return null;

  const split = sort.lastIndexOf("-");
  const field = sort.slice(0, split);
  const dir = sort.slice(split + 1);
  if (dir !== "asc" && dir !== "desc") return null;

  const meta = fieldDefinitions.find(
    (f) => f.field === field && SORTABLE_FIELD_TYPES.includes(f.type),
  );
  return meta ? { meta, dir } : null;
}

function sortUsesStoredPrices(
  sort: string | null,
  fieldDefinitions: FieldMeta[],
): boolean {
  const path = sortField(sort, fieldDefinitions)?.meta.path;
  return (
    !!path && (isCardPriceKey(path) || isCardPriceDetailKey(path.split(".")[0]))
  );
}

export function cardOrderSql(
  sort: string | null,
  fieldDefinitions: FieldMeta[],
): SQL {
  const newestFirst = sql`cc.scanned_at DESC, cc.id DESC`;
  const sorted = sortField(sort, fieldDefinitions);
  if (!sorted) return newestFirst;
  const { meta, dir } = sorted;

  const value = fieldValueSql(meta.path);
  const text = sql`COALESCE(${value} #>> '{}', '')`;
  let key: SQL;
  if (meta.type === "numeric") {
    key = sql`(substring(${value} #>> '{}' from ${NUMERIC_PREFIX_SQL_PATTERN}::text))::float8`;
  } else if (meta.type === "enum" && meta.options) {
    const whens = meta.options.map(
      (option, i) =>
        sql`WHEN ${String(option.value)}::text THEN ${sql.raw(String(i))}`,
    );
    key =
      whens.length > 0
        ? sql`(CASE ${text} ${sql.join(whens, sql` `)} ELSE ${sql.raw(String(meta.options.length))} END)`
        : sql`0`;
  } else {
    key = sql`${text} COLLATE "und-x-icu"`;
  }

  return sql`${key} ${dir === "asc" ? sql`ASC` : sql`DESC`}, ${newestFirst}`;
}

function rankedCardsCte(
  collection: CardsCollection,
  query: CollectionCardsQuery,
  keepScanId?: string,
): SQL {
  const entryKey = query.grouped ? sql`dup_key` : sql`guid`;
  return sql`
    ranked AS (
      SELECT
        cc.id, cc.guid, sl.id AS location_id,
        ${DUPLICATE_KEY} AS dup_key,
        row_number() OVER (ORDER BY ${cardOrderSql(query.sort, collection.fieldDefinitions)}) AS rn
      FROM collection_cards cc
      ${STORAGE_LOCATION_JOIN}
      ${sortUsesStoredPrices(query.sort, collection.fieldDefinitions) ? cardPricesJoinSql("cp", collection, CC_ALIAS_SQL_COLUMNS) : sql``}
      WHERE cc.collection_id = ${collection.id} AND ${cardFilterSql(query, keepScanId)}
    ),
    grouped AS (
      SELECT
        ranked.*,
        min(rn) OVER (PARTITION BY ${entryKey}) AS entry_rn,
        count(*) OVER (PARTITION BY ${entryKey})::int AS quantity,
        count(location_id) OVER (PARTITION BY ${entryKey})::int AS stored_count,
        array_agg(guid::text) OVER (
          PARTITION BY ${entryKey} ORDER BY rn
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS scan_ids
      FROM ranked
    )`;
}

const CARD_ROW_COLUMNS = sql`
  cc.guid, cc.card, ${SCANNED_AT_MS} AS scanned_at_ms, cc.bin_number,
  cc.is_foil, cc.foil_type, cc.condition, cc.is_downloaded,
  cc.alternative_matches, cc.is_corrected, cc.low_confidence_match, cc.is_reviewed,
  cc.location_position, sl.guid::text AS location_guid, sl.name AS location_name`;

function toCard(row: CollectionCardRow) {
  return toScannedCard({
    guid: row.guid,
    card: row.card,
    scannedAt: new Date(row.scanned_at_ms),
    binNumber: row.bin_number,
    isFoil: row.is_foil,
    foilType: row.foil_type,
    condition: row.condition,
    isDownloaded: row.is_downloaded,
    alternativeMatches: row.alternative_matches,
    isCorrected: row.is_corrected,
    lowConfidenceMatch: row.low_confidence_match,
    isReviewed: row.is_reviewed,
    storageLocation: row.location_guid
      ? {
          guid: row.location_guid,
          name: row.location_name ?? "",
          position: row.location_position ?? 0,
        }
      : null,
  });
}

export async function loadCardsPage(
  tx: Transaction,
  collection: CardsCollection,
  query: CollectionCardsQuery,
  page: number,
  pageSize: number,
): Promise<{
  items: GroupedScannedCard[];
  totalEntries: number;
  totalCards: number;
}> {
  const cte = rankedCardsCte(collection, query);
  const result = await tx.execute(sql`
    WITH ${cte},
    page AS (
      SELECT id, entry_rn, scan_ids, quantity, stored_count,
        count(*) OVER ()::int AS total_entries,
        sum(quantity) OVER ()::int AS total_cards
      FROM grouped
      WHERE rn = entry_rn
      ORDER BY entry_rn
      LIMIT ${pageSize}::int OFFSET ${page * pageSize}::int
    )
    SELECT ${CARD_ROW_COLUMNS},
      page.scan_ids, page.quantity, page.stored_count,
      page.total_entries, page.total_cards
    FROM page
    JOIN collection_cards cc ON cc.id = page.id
    ${STORAGE_LOCATION_JOIN}
    ORDER BY page.entry_rn
  `);
  const rows = result.rows as unknown as (CollectionCardRow & {
    scan_ids: string[];
    quantity: number;
    stored_count: number;
    total_entries: number;
    total_cards: number;
  })[];
  const totals =
    rows[0] ?? (page > 0 ? await loadCardTotals(tx, cte) : undefined);
  return {
    items: rows.map((row) => ({
      ...toCard(row),
      scanIds: row.scan_ids,
      quantity: row.quantity,
      storedCount: row.stored_count,
    })),
    totalEntries: totals?.total_entries ?? 0,
    totalCards: totals?.total_cards ?? 0,
  };
}

export async function loadCardCopies(
  tx: Transaction,
  collection: CardsCollection,
  cardIds: string[],
  limit: number,
): Promise<ScannedCard[]> {
  if (cardIds.length === 0) return [];
  const result = await tx.execute(sql`
    SELECT ${CARD_ROW_COLUMNS}
    FROM collection_cards cc
    ${STORAGE_LOCATION_JOIN}
    LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id
    WHERE cc.collection_id = ${collection.id}
      AND cc.card_id = ${anyOf(cardIds)}
      AND (il.id IS NULL OR il.status = 'accepted')
    ORDER BY array_position(${pgTextArray(cardIds)}::text[], cc.card_id),
      (sl.id IS NULL), sl.name, cc.location_position, cc.scanned_at DESC, cc.id DESC
    LIMIT ${limit}::int
  `);
  return (result.rows as unknown as CollectionCardRow[]).map(toCard);
}

async function loadCardTotals(
  tx: Transaction,
  cte: SQL,
): Promise<{ total_cards: number; total_entries: number } | undefined> {
  const totals = await tx.execute(sql`
    WITH ${cte}
    SELECT
      count(*)::int AS total_cards,
      (count(*) FILTER (WHERE rn = entry_rn))::int AS total_entries
    FROM grouped
  `);
  return totals.rows[0] as unknown as
    | { total_cards: number; total_entries: number }
    | undefined;
}

export async function loadCardPosition(
  tx: Transaction,
  collection: CardsCollection,
  query: CollectionCardsQuery,
  scanId: string,
) {
  const result = await tx.execute(sql`
    WITH ${rankedCardsCte(collection, query, scanId)},
    nav AS (
      SELECT
        grouped.*,
        (row_number() OVER (ORDER BY entry_rn, rn) - 1)::int AS pos,
        count(*) OVER ()::int AS total,
        (row_number() OVER (PARTITION BY dup_key ORDER BY rn) - 1)::int AS copy_index,
        count(*) OVER (PARTITION BY dup_key)::int AS copy_count
      FROM grouped
    )
    SELECT
      ${CARD_ROW_COLUMNS},
      target.pos, target.total, target.copy_index, target.copy_count,
      (SELECT guid::text FROM nav WHERE nav.pos = target.pos - 1) AS prev_scan_id,
      (SELECT guid::text FROM nav WHERE nav.pos = target.pos + 1) AS next_scan_id
    FROM nav target
    JOIN collection_cards cc ON cc.id = target.id
    ${STORAGE_LOCATION_JOIN}
    WHERE target.guid = ${scanId}::uuid
  `);

  const row = result.rows[0] as unknown as
    | (CollectionCardRow & {
        pos: number;
        total: number;
        copy_index: number;
        copy_count: number;
        prev_scan_id: string | null;
        next_scan_id: string | null;
      })
    | undefined;
  if (!row) return null;
  return {
    entry: toCard(row),
    index: row.pos,
    total: row.total,
    prevScanId: row.prev_scan_id,
    nextScanId: row.next_scan_id,
    copyIndex: row.copy_index,
    copyCount: row.copy_count,
  };
}

export async function loadCardIds(
  tx: Transaction,
  collection: CardsCollection,
  query: CollectionCardsQuery,
): Promise<string[]> {
  const result = await tx.execute(sql`
    WITH ${rankedCardsCte(collection, query)}
    SELECT guid::text AS guid FROM grouped ORDER BY entry_rn, rn
  `);
  return (result.rows as unknown as { guid: string }[]).map((row) => row.guid);
}

export async function loadAllCards(
  tx: Transaction,
  collection: { id: number; gameKey: string | null; lang: string },
) {
  const result = await tx.execute(sql`
    SELECT cc.guid, (cc.card || COALESCE(${joinedCardPricesJsonSql()}, '{}'::jsonb)) AS card,
      ${SCANNED_AT_MS} AS scanned_at_ms, cc.bin_number,
      cc.is_foil, cc.foil_type, cc.condition, cc.is_downloaded,
      cc.alternative_matches, cc.is_corrected, cc.low_confidence_match, cc.is_reviewed,
      cc.location_position, sl.guid::text AS location_guid, sl.name AS location_name
    FROM collection_cards cc
    ${cardPricesJoinSql("cp", collection, CC_ALIAS_SQL_COLUMNS)}
    ${STORAGE_LOCATION_JOIN}
    WHERE cc.collection_id = ${collection.id}
    ORDER BY cc.scanned_at DESC, cc.id DESC
  `);
  return (result.rows as unknown as CollectionCardRow[]).map(toCard);
}

function cardStatsJsonSql(source: SQL): SQL {
  return sql`(
    SELECT jsonb_build_object(
      'totalCount', count(*)::int,
      'uniqueCount', count(DISTINCT card_key)::int,
      'totalValue', COALESCE(sum(price) FILTER (WHERE price > 0), 0)::float8,
      'priceableCount', (count(*) FILTER (WHERE price > 0))::int
    ) FROM ${source}
  ) || jsonb_build_object(
    'mostValuable', (
      SELECT json_build_object('name', name, 'price', price)
      FROM ${source} WHERE price > 0
      ORDER BY price DESC, scanned_at DESC LIMIT 1
    ),
    'sets', (
      SELECT COALESCE(json_agg(s), '[]'::json) FROM (
        SELECT
          set_code AS code,
          (array_agg(set_name ORDER BY scanned_at DESC))[1] AS name,
          count(*)::int AS count,
          sum(price)::float8 AS value
        FROM ${source} GROUP BY set_code
      ) s
    ),
    'rarities', (
      SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT rarity AS key, count(*)::int AS count
        FROM ${source} WHERE COALESCE(rarity, '') <> ''
        GROUP BY rarity
      ) r
    ),
    'colors', (
      SELECT COALESCE(json_agg(c), '[]'::json) FROM (
        SELECT color AS key, count(*)::int AS count
        FROM ${source}, jsonb_array_elements_text(colors) AS color
        GROUP BY color
      ) c
    ),
    'foilTypes', (
      SELECT COALESCE(json_agg(ft), '[]'::json) FROM (
        SELECT COALESCE(foil_type, 'Foil') AS key, count(*)::int AS count
        FROM ${source} WHERE foil_type IS NOT NULL OR is_foil
        GROUP BY COALESCE(foil_type, 'Foil')
      ) ft
    )
  )`;
}

function cardStatsBaseSql(
  collection: { id: number; gameKey: string | null; lang: string },
  filter: SQL,
  pricing: OrgPricing,
): SQL {
  const priceKeys = Object.keys(CARD_PRICE_COLUMNS) as CardPriceKey[];
  const priceKeyColumns = sql.raw(
    priceKeys.map((key) => `, "${key}" jsonb`).join(""),
  );
  const priceCard = sql.raw(
    `jsonb_build_object('lang', j.lang${priceKeys.map((key) => `, '${key}', j."${key}"`).join("")})`,
  );
  const cols = { ...CC_ALIAS_SQL_COLUMNS, card: sql`jp.card` };
  const price = sql`COALESCE(${joinedScannedCardPriceSql(pricing, cols, "cp")}, 0)`;
  return sql`
    SELECT cc.card_id AS card_key, j.name, j."set" AS set_code, j."setName" AS set_name,
      j.rarity,
      CASE WHEN jsonb_typeof(j."colorIdentity") = 'array'
        THEN j."colorIdentity" ELSE '[]'::jsonb END AS colors,
      cc.is_foil, cc.foil_type, cc.scanned_at,
      ${price} AS price, (${filter}) AS in_filter
    FROM collection_cards cc
    CROSS JOIN LATERAL jsonb_to_record(cc.card) AS j(
      name text, "set" text, "setName" text, rarity text,
      "colorIdentity" jsonb, lang text${priceKeyColumns}
    )
    CROSS JOIN LATERAL (SELECT ${priceCard} AS card) jp
    ${cardPricesJoinSql("cp", collection, cols)}
    WHERE cc.collection_id = ${collection.id}
  `;
}

export async function loadCardStats(
  tx: Transaction,
  collection: { id: number; gameKey: string | null; lang: string },
  filter: SQL,
  pricing: OrgPricing,
): Promise<{ all: CardStatsAggregate; filtered: CardStatsAggregate }> {
  const result = await tx.execute(sql`
    WITH base AS MATERIALIZED (${cardStatsBaseSql(collection, filter, pricing)}),
    filtered AS (SELECT * FROM base WHERE in_filter)
    SELECT
      ${cardStatsJsonSql(sql`base`)} AS all_stats,
      ${cardStatsJsonSql(sql`filtered`)} AS filtered_stats
  `);
  const row = result.rows[0] as unknown as {
    all_stats: CardStatsAggregate;
    filtered_stats: CardStatsAggregate;
  };
  return { all: row.all_stats, filtered: row.filtered_stats };
}

export async function loadAllCardStats(
  tx: Transaction,
  collection: { id: number; gameKey: string | null; lang: string },
  pricing: OrgPricing,
): Promise<CardStatsAggregate> {
  const result = await tx.execute(sql`
    WITH base AS MATERIALIZED (${cardStatsBaseSql(collection, sql`true`, pricing)})
    SELECT ${cardStatsJsonSql(sql`base`)} AS all_stats
  `);
  const row = result.rows[0] as unknown as { all_stats: CardStatsAggregate };
  return row.all_stats;
}

function binWindowsJoin(collectionId: number, bins: BinWindow[]): SQL {
  return sql`
    FROM jsonb_to_recordset(${JSON.stringify(bins)}::jsonb)
      AS b("binNumber" int, "lastEmptiedAt" float8)
    JOIN collection_cards cc
      ON cc.collection_id = ${collectionId}
      AND cc.bin_number = b."binNumber"
      AND (
        b."lastEmptiedAt" IS NULL
        OR cc.scanned_at > to_timestamp(b."lastEmptiedAt" / 1000.0) AT TIME ZONE 'UTC'
      )`;
}

export async function loadBinCounts(
  tx: Transaction,
  collectionId: number,
  bins: BinWindow[],
) {
  if (bins.length === 0) return [];
  const result = await tx.execute(sql`
    SELECT b."binNumber" AS bin_number,
      (
        SELECT count(*) FROM collection_cards cc
        WHERE cc.collection_id = ${collectionId}
          AND cc.bin_number = b."binNumber"
          AND (
            b."lastEmptiedAt" IS NULL
            OR cc.scanned_at > to_timestamp(b."lastEmptiedAt" / 1000.0) AT TIME ZONE 'UTC'
          )
      )::int + (
        SELECT count(*) FROM unmatched_cards u
        WHERE u.collection_id = ${collectionId}
          AND u.bin_number = b."binNumber"
          AND u.is_deleted = false
          AND (
            b."lastEmptiedAt" IS NULL
            OR u.scanned_at > to_timestamp(b."lastEmptiedAt" / 1000.0) AT TIME ZONE 'UTC'
          )
      )::int AS count
    FROM jsonb_to_recordset(${JSON.stringify(bins)}::jsonb)
      AS b("binNumber" int, "lastEmptiedAt" float8)
  `);
  return (
    result.rows as unknown as { bin_number: number; count: number }[]
  ).map((row) => ({ binNumber: row.bin_number, count: row.count }));
}

export async function loadBinContents(
  tx: Transaction,
  collectionId: number,
  bins: BinWindow[],
) {
  if (bins.length === 0) return [];
  const result = await tx.execute(sql`
    SELECT cc.guid::text AS guid, cc.bin_number, cc.card, cc.is_foil, cc.foil_type,
      ${SCANNED_AT_MS} AS scanned_at_ms
    ${binWindowsJoin(collectionId, bins)}
    ORDER BY cc.scanned_at DESC, cc.id DESC
  `);
  return (
    result.rows as unknown as {
      guid: string;
      bin_number: number;
      card: GroupedScannedCard["card"];
      is_foil: boolean;
      foil_type: string | null;
      scanned_at_ms: number;
    }[]
  ).map((row) => ({
    scanId: row.guid,
    binNumber: row.bin_number,
    scannedAt: row.scanned_at_ms,
    card: row.card,
    isFoil: row.is_foil,
    foilType: row.foil_type ?? undefined,
  }));
}
