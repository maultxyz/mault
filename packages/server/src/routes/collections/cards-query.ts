import {
  DEFAULT_CARD_SORT,
  EMPTY_CARD_FILTERS,
  type BinWindow,
  type CardFilters,
  type CardStatsAggregate,
  type CollectionCardsQuery,
  type FieldMeta,
  type GroupedScannedCard,
} from "@magic-vault/shared";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Transaction } from "../../db";
import { collections, games } from "../../db/schema";
import { toScannedCard } from "./shared";

const SORTABLE_TYPES: FieldMeta["type"][] = ["string", "numeric", "enum"];

const NUMERIC_PREFIX_PATTERN = String.raw`^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)`;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
): Promise<{
  id: number;
  gameKey: string | null;
  fieldDefinitions: FieldMeta[];
} | null> {
  if (!isUuid(guid)) return null;
  const [collection] = await tx
    .select({
      id: collections.id,
      gameKey: games.key,
      fieldDefinitions: games.fieldDefinitions,
    })
    .from(collections)
    .leftJoin(games, eq(games.id, collections.gameId))
    .where(and(eq(collections.guid, guid), eq(collections.orgId, orgId)))
    .limit(1);
  if (!collection) return null;
  return {
    id: collection.id,
    gameKey: collection.gameKey,
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

const DUPLICATE_KEY = sql`(COALESCE(cc.card ->> 'id', '') || ':' || cc.is_foil::text || ':' || COALESCE(cc.foil_type, ''))`;

const CARD_PRICE = sql`COALESCE(CASE WHEN cc.is_foil THEN ${jsonNumber("priceFoil")} END, ${jsonNumber("price")}, 0)`;

const SCANNED_AT_MS = sql`(extract(epoch from cc.scanned_at) * 1000)::float8`;

const SEARCH_FIELDS = [
  "name",
  "setName",
  "set",
  "typeLine",
  "collectorNumber",
  "text",
];

function fieldValueSql(path: string): SQL {
  const segments = path.split(".");
  return sql`COALESCE(cc.card #> ${pgTextArray(["raw", ...segments])}::text[], cc.card #> ${pgTextArray(segments)}::text[])`;
}

function anyOf(values: string[]): SQL {
  return sql`ANY(${pgTextArray(values)}::text[])`;
}

export function cardFilterSql({ filters, search }: CollectionCardsQuery): SQL {
  const conditions: SQL[] = [];

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
    conditions.push(
      sql`(jsonb_typeof(cc.alternative_matches) = 'array' AND jsonb_array_length(cc.alternative_matches) > 0)`,
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
    const matches = SEARCH_FIELDS.map(
      (key) =>
        sql`strpos(lower(COALESCE(cc.card ->> ${key}::text, '')), ${search}::text) > 0`,
    );
    conditions.push(sql`(${sql.join(matches, sql` OR `)})`);
  }

  return conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`;
}

export function cardOrderSql(
  sort: string | null,
  fieldDefinitions: FieldMeta[],
): SQL {
  const newestFirst = sql`cc.scanned_at DESC, cc.id DESC`;
  if (!sort || sort === DEFAULT_CARD_SORT) return newestFirst;

  const split = sort.lastIndexOf("-");
  const field = sort.slice(0, split);
  const dir = sort.slice(split + 1);
  if (dir !== "asc" && dir !== "desc") return newestFirst;

  const meta = fieldDefinitions.find(
    (f) => f.field === field && SORTABLE_TYPES.includes(f.type),
  );
  if (!meta) return newestFirst;

  const value = fieldValueSql(meta.path);
  const text = sql`COALESCE(${value} #>> '{}', '')`;
  let key: SQL;
  if (meta.type === "numeric") {
    key = sql`(substring(${value} #>> '{}' from ${NUMERIC_PREFIX_PATTERN}::text))::float8`;
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
  collectionId: number,
  query: CollectionCardsQuery,
  fieldDefinitions: FieldMeta[],
): SQL {
  const entryKey = query.grouped ? sql`dup_key` : sql`guid`;
  return sql`
    ranked AS (
      SELECT
        cc.id, cc.guid, cc.card, cc.bin_number, cc.is_foil, cc.foil_type,
        cc.is_downloaded, cc.alternative_matches, cc.is_corrected,
        ${SCANNED_AT_MS} AS scanned_at_ms,
        ${DUPLICATE_KEY} AS dup_key,
        row_number() OVER (ORDER BY ${cardOrderSql(query.sort, fieldDefinitions)}) AS rn
      FROM collection_cards cc
      WHERE cc.collection_id = ${collectionId} AND ${cardFilterSql(query)}
    ),
    grouped AS (
      SELECT
        ranked.*,
        min(rn) OVER (PARTITION BY ${entryKey}) AS entry_rn,
        count(*) OVER (PARTITION BY ${entryKey})::int AS quantity,
        array_agg(guid::text) OVER (
          PARTITION BY ${entryKey} ORDER BY rn
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS scan_ids
      FROM ranked
    )`;
}

interface CardRow {
  guid: string;
  card: unknown;
  scanned_at_ms: number;
  bin_number: number | null;
  is_foil: boolean;
  foil_type: string | null;
  is_downloaded: boolean;
  alternative_matches: unknown;
  is_corrected: boolean;
}

function toCard(row: CardRow) {
  return toScannedCard({
    guid: row.guid,
    card: row.card,
    scannedAt: new Date(row.scanned_at_ms),
    binNumber: row.bin_number,
    isFoil: row.is_foil,
    foilType: row.foil_type,
    isDownloaded: row.is_downloaded,
    alternativeMatches: row.alternative_matches,
    isCorrected: row.is_corrected,
  });
}

export async function loadCardsPage(
  tx: Transaction,
  collectionId: number,
  fieldDefinitions: FieldMeta[],
  query: CollectionCardsQuery,
  page: number,
  pageSize: number,
): Promise<{
  items: GroupedScannedCard[];
  totalEntries: number;
  totalCards: number;
}> {
  const cte = rankedCardsCte(collectionId, query, fieldDefinitions);
  const [items, totals] = await Promise.all([
    tx.execute(sql`
      WITH ${cte}
      SELECT guid, card, scanned_at_ms, bin_number, is_foil, foil_type,
        is_downloaded, alternative_matches, is_corrected, scan_ids, quantity
      FROM grouped
      WHERE rn = entry_rn
      ORDER BY entry_rn
      LIMIT ${pageSize}::int OFFSET ${page * pageSize}::int
    `),
    tx.execute(sql`
      WITH ${cte}
      SELECT
        count(*)::int AS total_cards,
        (count(*) FILTER (WHERE rn = entry_rn))::int AS total_entries
      FROM grouped
    `),
  ]);

  const totalsRow = totals.rows[0] as unknown as
    | { total_cards: number; total_entries: number }
    | undefined;
  return {
    items: (
      items.rows as unknown as (CardRow & {
        scan_ids: string[];
        quantity: number;
      })[]
    ).map((row) => ({
      ...toCard(row),
      scanIds: row.scan_ids,
      quantity: row.quantity,
    })),
    totalEntries: totalsRow?.total_entries ?? 0,
    totalCards: totalsRow?.total_cards ?? 0,
  };
}

export async function loadCardPosition(
  tx: Transaction,
  collectionId: number,
  fieldDefinitions: FieldMeta[],
  query: CollectionCardsQuery,
  scanId: string,
) {
  const result = await tx.execute(sql`
    WITH ${rankedCardsCte(collectionId, query, fieldDefinitions)},
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
      target.*,
      (SELECT guid::text FROM nav WHERE nav.pos = target.pos - 1) AS prev_scan_id,
      (SELECT guid::text FROM nav WHERE nav.pos = target.pos + 1) AS next_scan_id
    FROM nav target
    WHERE target.guid = ${scanId}::uuid
  `);

  const row = result.rows[0] as unknown as
    | (CardRow & {
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
  collectionId: number,
  fieldDefinitions: FieldMeta[],
  query: CollectionCardsQuery,
): Promise<string[]> {
  const result = await tx.execute(sql`
    WITH ${rankedCardsCte(collectionId, query, fieldDefinitions)}
    SELECT guid::text AS guid FROM grouped ORDER BY entry_rn, rn
  `);
  return (result.rows as unknown as { guid: string }[]).map((row) => row.guid);
}

export async function loadAllCards(tx: Transaction, collectionId: number) {
  const result = await tx.execute(sql`
    SELECT cc.guid, cc.card, ${SCANNED_AT_MS} AS scanned_at_ms, cc.bin_number,
      cc.is_foil, cc.foil_type, cc.is_downloaded, cc.alternative_matches,
      cc.is_corrected
    FROM collection_cards cc
    WHERE cc.collection_id = ${collectionId}
    ORDER BY cc.scanned_at DESC, cc.id DESC
  `);
  return (result.rows as unknown as CardRow[]).map(toCard);
}

export async function loadCardStats(
  tx: Transaction,
  collectionId: number,
  filter: SQL,
): Promise<CardStatsAggregate> {
  const result = await tx.execute(sql`
    WITH f AS (
      SELECT cc.card, cc.is_foil, cc.foil_type, cc.scanned_at, ${CARD_PRICE} AS price
      FROM collection_cards cc
      WHERE cc.collection_id = ${collectionId} AND ${filter}
    )
    SELECT
      (SELECT count(*)::int FROM f) AS total_count,
      (SELECT count(DISTINCT card ->> 'id')::int FROM f) AS unique_count,
      (SELECT COALESCE(sum(price) FILTER (WHERE price > 0), 0)::float8 FROM f) AS total_value,
      (SELECT (count(*) FILTER (WHERE price > 0))::int FROM f) AS priceable_count,
      (
        SELECT json_build_object('name', card ->> 'name', 'price', price)
        FROM f WHERE price > 0
        ORDER BY price DESC, scanned_at DESC LIMIT 1
      ) AS most_valuable,
      (
        SELECT COALESCE(json_agg(s), '[]'::json) FROM (
          SELECT
            card ->> 'set' AS code,
            (array_agg(card ->> 'setName' ORDER BY scanned_at DESC))[1] AS name,
            count(*)::int AS count,
            sum(price)::float8 AS value
          FROM f GROUP BY card ->> 'set'
        ) s
      ) AS sets,
      (
        SELECT COALESCE(json_agg(r), '[]'::json) FROM (
          SELECT card ->> 'rarity' AS key, count(*)::int AS count
          FROM f WHERE COALESCE(card ->> 'rarity', '') <> ''
          GROUP BY card ->> 'rarity'
        ) r
      ) AS rarities,
      (
        SELECT COALESCE(json_agg(c), '[]'::json) FROM (
          SELECT color AS key, count(*)::int AS count
          FROM f, jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(card -> 'colorIdentity') = 'array'
              THEN card -> 'colorIdentity' ELSE '[]'::jsonb END
          ) AS color
          GROUP BY color
        ) c
      ) AS colors,
      (
        SELECT COALESCE(json_agg(ft), '[]'::json) FROM (
          SELECT COALESCE(foil_type, 'Foil') AS key, count(*)::int AS count
          FROM f WHERE foil_type IS NOT NULL OR is_foil
          GROUP BY COALESCE(foil_type, 'Foil')
        ) ft
      ) AS foil_types
  `);

  const row = result.rows[0] as unknown as {
    total_count: number;
    unique_count: number;
    total_value: number;
    priceable_count: number;
    most_valuable: { name: string; price: number } | null;
    sets: CardStatsAggregate["sets"];
    rarities: CardStatsAggregate["rarities"];
    colors: CardStatsAggregate["colors"];
    foil_types: CardStatsAggregate["foilTypes"];
  };
  return {
    totalCount: row.total_count,
    uniqueCount: row.unique_count,
    totalValue: row.total_value,
    priceableCount: row.priceable_count,
    mostValuable: row.most_valuable,
    sets: row.sets,
    rarities: row.rarities,
    colors: row.colors,
    foilTypes: row.foil_types,
  };
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
    SELECT b."binNumber" AS bin_number, count(cc.id)::int AS count
    ${binWindowsJoin(collectionId, bins)}
    GROUP BY b."binNumber"
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
    SELECT cc.guid::text AS guid, cc.bin_number, cc.card, ${SCANNED_AT_MS} AS scanned_at_ms
    ${binWindowsJoin(collectionId, bins)}
    ORDER BY cc.scanned_at DESC, cc.id DESC
  `);
  return (
    result.rows as unknown as {
      guid: string;
      bin_number: number;
      card: GroupedScannedCard["card"];
      scanned_at_ms: number;
    }[]
  ).map((row) => ({
    scanId: row.guid,
    binNumber: row.bin_number,
    scannedAt: row.scanned_at_ms,
    card: row.card,
  }));
}
