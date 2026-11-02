import { setImmediate as yieldToEventLoop } from "node:timers/promises";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { collections, games } from "../db/schema";
import { resolveCardSearchForGame } from "./card-search/resolve";
import {
  cardMatchSegmentBytes,
  createCardMatchSegmentBuilder,
} from "./card-match-search";
import {
  CARD_MATCH_GAME_LANGS_CACHE_MAX_ENTRIES,
  CARD_MATCH_INDEX_DEFAULT_MAX_MB,
  CARD_MATCH_INDEX_EVICTION_MIN_IDLE_MS,
  CARD_MATCH_INDEX_PAGE_SIZE,
  CARD_MATCH_INDEX_PI_DEFAULT_MAX_MB,
  CARD_MATCH_INDEX_REVALIDATE_MS,
  CARD_MATCH_INDEX_ROWS_PER_EVENT_LOOP_TURN,
  MILO_EMBEDDING_DIM,
} from "./constants/card-search";
import type {
  CardMatchSegment,
  CardMatchSegmentEntry,
  CardMatchSegmentSignature,
  LoadedCardMatchSegment,
} from "./interfaces/card-match-index";
import type { CollectionMatchScope } from "./interfaces/card-search";
import { createKeyedCache } from "./keyed-cache";
import { isPiHost } from "./pi-host";
import { getState as getSyncState } from "./sync-job/state";

const segmentEntries = new Map<string, CardMatchSegmentEntry>();
const gameLangsCache = createKeyedCache<string[]>(
  CARD_MATCH_INDEX_REVALIDATE_MS,
  CARD_MATCH_GAME_LANGS_CACHE_MAX_ENTRIES,
);
const memoryBudgetBytes =
  (Number(process.env.CARD_MATCH_INDEX_MAX_MB) ||
    (isPiHost()
      ? CARD_MATCH_INDEX_PI_DEFAULT_MAX_MB
      : CARD_MATCH_INDEX_DEFAULT_MAX_MB)) *
  1024 *
  1024;

function decodeVector(base64: string | null): Float32Array | null {
  if (!base64) return null;
  const bytes = Buffer.from(base64, "base64");
  const dimensions = bytes.readUInt16BE(0);
  if (dimensions !== MILO_EMBEDDING_DIM) {
    throw new Error(
      `Stored embedding has ${dimensions} dimensions, expected ${MILO_EMBEDDING_DIM}.`,
    );
  }
  const vector = new Float32Array(dimensions);
  for (let i = 0; i < dimensions; i++) vector[i] = bytes.readFloatBE(4 + i * 4);
  return vector;
}

async function loadSegmentSignature(
  gameKey: string,
  lang: string,
): Promise<CardMatchSegmentSignature> {
  const result = await db.execute<{
    row_count: number;
    back_face_count: number;
    last_updated: string;
    last_id: number;
  }>(sql`
    SELECT count(*)::int AS row_count,
      count(back_embedding)::int AS back_face_count,
      coalesce(max(updated_at)::text, '') AS last_updated,
      coalesce(max(id), 0) AS last_id
    FROM cards
    WHERE game_key = ${gameKey} AND lang = ${lang}
  `);
  const { row_count, back_face_count, last_updated, last_id } =
    result.rows[0];
  return {
    value: `${row_count}|${back_face_count}|${last_updated}|${last_id}`,
    rowCount: row_count,
    backFaceCount: back_face_count,
  };
}

async function loadSegment(
  gameKey: string,
  lang: string,
): Promise<LoadedCardMatchSegment> {
  const startedAt = Date.now();
  const signature = await loadSegmentSignature(gameKey, lang);
  const adapter = resolveCardSearchForGame(gameKey, lang)?.adapter;
  const rarePrintingSql = adapter?.rarePrintingSql ?? sql`false`;
  const exclusionFilter = adapter?.excludedFromMatchingSql
    ? sql`AND NOT coalesce(${adapter.excludedFromMatchingSql}, false)`
    : sql``;

  const builder = createCardMatchSegmentBuilder(gameKey, lang, {
    expectedRows: signature.rowCount,
    expectedBackFaces: signature.backFaceCount,
  });
  let afterCardId = "";
  for (;;) {
    const page = await db.execute<{
      card_id: string;
      name: string;
      set_code: string;
      rare_printing: boolean;
      embedding: string;
      back_embedding: string | null;
    }>(sql`
      SELECT card_id, name, set_code,
        coalesce(${rarePrintingSql}, false) AS rare_printing,
        encode(vector_send(embedding), 'base64') AS embedding,
        encode(vector_send(back_embedding), 'base64') AS back_embedding
      FROM cards
      WHERE game_key = ${gameKey} AND lang = ${lang} AND card_id > ${afterCardId}
        ${exclusionFilter}
      ORDER BY card_id
      LIMIT ${CARD_MATCH_INDEX_PAGE_SIZE}
    `);
    for (const [index, row] of page.rows.entries()) {
      builder.add({
        cardId: row.card_id,
        name: row.name,
        setCode: row.set_code,
        rarePrinting: row.rare_printing === true,
        embedding: decodeVector(row.embedding)!,
        backEmbedding: decodeVector(row.back_embedding),
      });
      if ((index + 1) % CARD_MATCH_INDEX_ROWS_PER_EVENT_LOOP_TURN === 0) {
        await yieldToEventLoop();
      }
    }
    if (page.rows.length < CARD_MATCH_INDEX_PAGE_SIZE) break;
    afterCardId = page.rows[page.rows.length - 1].card_id;
  }

  const segment = builder.finish();
  console.log(
    `[card-match-index] loaded ${gameKey}/${lang}: ${segment.cardIds.length} cards, ${Math.round(cardMatchSegmentBytes(segment) / 1024 / 1024)} MB in ${Date.now() - startedAt}ms`,
  );
  return { segment, signature: signature.value };
}

function logReloadFailure(entry: CardMatchSegmentEntry) {
  return (err: unknown) =>
    console.error(
      `[card-match-index] failed to reload ${entry.gameKey}/${entry.lang}:`,
      err,
    );
}

function reloadSegment(entry: CardMatchSegmentEntry): Promise<void> {
  if (entry.loading) {
    entry.reloadRequested = true;
    return entry.loading;
  }
  entry.checkedAt = Date.now();
  const loading = loadSegment(entry.gameKey, entry.lang)
    .then(({ segment, signature }) => {
      entry.segment = segment;
      entry.signature = signature;
      evictIdleSegmentsOverBudget();
    })
    .finally(() => {
      entry.loading = null;
      if (entry.reloadRequested) {
        entry.reloadRequested = false;
        reloadSegment(entry).catch(logReloadFailure(entry));
      }
    });
  entry.loading = loading;
  return loading;
}

function evictIdleSegmentsOverBudget() {
  const loaded = [...segmentEntries.entries()].filter(
    ([, entry]) => entry.segment,
  );
  let totalBytes = loaded.reduce(
    (sum, [, entry]) => sum + cardMatchSegmentBytes(entry.segment!),
    0,
  );
  const evictable = loaded
    .filter(
      ([, entry]) =>
        !entry.loading &&
        Date.now() - entry.lastUsedAt >= CARD_MATCH_INDEX_EVICTION_MIN_IDLE_MS,
    )
    .sort(([, a], [, b]) => a.lastUsedAt - b.lastUsedAt);
  for (const [key, entry] of evictable) {
    if (totalBytes <= memoryBudgetBytes) return;
    totalBytes -= cardMatchSegmentBytes(entry.segment!);
    segmentEntries.delete(key);
    console.log(
      `[card-match-index] evicted idle ${entry.gameKey}/${entry.lang} to stay under the memory budget`,
    );
  }
  if (totalBytes > memoryBudgetBytes) {
    console.warn(
      `[card-match-index] ${Math.round(totalBytes / 1024 / 1024)} MB of segments in use, over the ${Math.round(memoryBudgetBytes / 1024 / 1024)} MB budget (CARD_MATCH_INDEX_MAX_MB)`,
    );
  }
}

function isGameSyncing(gameKey: string): boolean {
  const sync = getSyncState();
  return sync.status === "running" && sync.gameKey === gameKey;
}

function revalidateSegmentInBackground(entry: CardMatchSegmentEntry) {
  if (
    entry.loading ||
    Date.now() - entry.checkedAt < CARD_MATCH_INDEX_REVALIDATE_MS ||
    isGameSyncing(entry.gameKey)
  ) {
    return;
  }
  entry.checkedAt = Date.now();
  loadSegmentSignature(entry.gameKey, entry.lang)
    .then((signature) =>
      signature.value === entry.signature ? undefined : reloadSegment(entry),
    )
    .catch(logReloadFailure(entry));
}

async function cardMatchSegment(
  gameKey: string,
  lang: string,
  isWarmup: boolean,
): Promise<CardMatchSegment> {
  const key = `${gameKey}:${lang}`;
  let entry = segmentEntries.get(key);
  if (!entry) {
    entry = {
      gameKey,
      lang,
      segment: null,
      signature: null,
      loading: null,
      reloadRequested: false,
      checkedAt: 0,
      lastUsedAt: 0,
    };
    segmentEntries.set(key, entry);
  }
  if (!isWarmup) entry.lastUsedAt = Date.now();
  if (entry.segment) {
    revalidateSegmentInBackground(entry);
    return entry.segment;
  }
  await reloadSegment(entry);
  return entry.segment!;
}

async function langsOfGame(gameKey: string): Promise<string[]> {
  return gameLangsCache.get(gameKey, async () => {
    const result = await db.execute<{ lang: string }>(
      sql`SELECT DISTINCT lang FROM cards WHERE game_key = ${gameKey}`,
    );
    return result.rows.map((row) => row.lang);
  });
}

async function segmentsForScope(
  { gameKey, lang, matchAllLanguages }: CollectionMatchScope,
  isWarmup: boolean,
): Promise<CardMatchSegment[]> {
  const langs = matchAllLanguages ? await langsOfGame(gameKey) : [lang];
  return Promise.all(
    langs.map((segmentLang) =>
      cardMatchSegment(gameKey, segmentLang, isWarmup),
    ),
  );
}

export function cardMatchSegments(
  scope: CollectionMatchScope,
): Promise<CardMatchSegment[]> {
  return segmentsForScope(scope, false);
}

export function invalidateCardMatchIndex(gameKey?: string): void {
  for (const entry of segmentEntries.values()) {
    if (gameKey === undefined || entry.gameKey === gameKey) {
      reloadSegment(entry).catch(logReloadFailure(entry));
    }
  }
}

async function warmCardMatchIndex(): Promise<void> {
  const scopes = await db
    .selectDistinct({
      gameKey: games.key,
      lang: collections.lang,
      matchAllLanguages: collections.matchAllLanguages,
    })
    .from(collections)
    .innerJoin(games, eq(games.id, collections.gameId))
    .where(and(eq(collections.isDeleted, false), eq(games.isDeleted, false)));
  for (const scope of scopes) {
    await segmentsForScope(scope, true);
  }
}

export function startCardMatchIndexWarmup(): void {
  warmCardMatchIndex().catch((err) =>
    console.error("[card-match-index] warmup failed:", err),
  );
}
