import "../disable-onnx-telemetry";

import type {
  SyncState,
  SyncStatus,
  SyncVectorizeOn,
} from "@magic-vault/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import type { SyncSource, SyncSourceCard } from "../interfaces/card-search";
import {
  CARD_EMBEDDING_VERSION,
  SYNC_DATA_REFRESH_BATCH_SIZE,
  SYNC_NEW_CARD_NAME_LIMIT,
  SYNC_PRUNE_DELETE_BATCH_SIZE,
  SYNC_PRUNE_LOGGED_NAME_LIMIT,
  SYNC_PRUNE_MAX_SHARE_OF_STORED_CARDS,
  SYNC_SHARED_FRONT_FACE_CACHE_MAX_IMAGES,
} from "../constants/sync";
import { vectorizeCardImage } from "../vectorize";
import type {
  ParentToWorkerMessage,
  WorkerToParentMessage,
} from "../interfaces/sync-job";
import {
  cancelBrowserQueue,
  claimBrowserWork,
  finishBrowserQueue,
  serveBrowserQueue,
  submitBrowserWork,
} from "./browser-queue";
import { SYNC_SOURCES } from "./sources";
import {
  resetSyncFetchCompleteness,
  syncFetchIncompleteReasons,
} from "./fetch-completeness";
import { planSyncPrune } from "./prune";
import { fetchPortraitCardImage } from "./card-image-fetch";
import { planCardSync } from "./card-sync-plan";
import { buildCatalogCardRow, sourceDataHashOf } from "./catalog-row";
import {
  addToPrintingMarkBatch,
  cardIdsWithCurrentPrintingMarks,
  dropOutdatedPrintingMarkReferences,
  gameUsesPrintingMarks,
  persistPrintingMarkBatch,
  printingMarkColumns,
  readCatalogPrintingMarks,
} from "../printing-marks/catalog";
import {
  PRINTING_MARK_BACKFILL_UPDATE_BATCH_SIZE,
  PRINTING_MARK_PROGRESS_LOG_EVERY_CARDS,
} from "../constants/printing-marks";
import type {
  CatalogPrintingMarks,
  PrintingMarkBatch,
} from "../interfaces/printing-marks";
import type {
  CardSyncAction,
  StoredCardSyncState,
  VectorizedFrontFace,
} from "../interfaces/sync-job";

function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = err.cause instanceof Error ? err.cause.message : null;
  return cause ? `${err.message}: ${cause}` : err.message;
}

function send(msg: WorkerToParentMessage, then?: () => void): void {
  if (!process.send) {
    then?.();
    return;
  }
  if (!then) {
    process.send(msg);
    return;
  }
  process.send(msg, undefined, undefined, () => then());
}

function exitAfterFlush(code: number): void {
  if (!process.send) process.exit(code);
  process.send({ type: "patchState", patch: {} }, undefined, undefined, () =>
    process.exit(code),
  );
}

let state: SyncState | null = null;

function getState(): SyncState {
  if (!state) throw new Error("Worker state read before a start message.");
  return state;
}

function patchState(patch: Partial<SyncState>): void {
  state = { ...getState(), ...patch };
  send({ type: "patchState", patch });
}

function incrementCounters(delta: {
  processed?: number;
  skipped?: number;
  errors?: number;
}): void {
  const syncState = getState();
  state = {
    ...syncState,
    processed: syncState.processed + (delta.processed ?? 0),
    skipped: syncState.skipped + (delta.skipped ?? 0),
    errors: syncState.errors + (delta.errors ?? 0),
  };
  send({ type: "incrementCounters", delta });
}

function addLog(msg: string): void {
  state = { ...getState(), logs: [...getState().logs.slice(-199), msg] };
  send({ type: "addLog", msg });
}

function emitEvent(event: string, data: unknown): void {
  send({ type: "emitEvent", event, data });
}

let cancelFlag = false;
let abortController: AbortController | null = null;

function isCancelled(): boolean {
  return cancelFlag;
}

function getAbortSignal(): AbortSignal | undefined {
  return abortController?.signal;
}

function beginRun(): void {
  cancelFlag = false;
  abortController = new AbortController();
}

const VECTORIZE_CONCURRENCY = parseInt(
  process.env.VECTORIZE_CONCURRENCY ?? "10",
);
const INSERT_BATCH_SIZE = parseInt(process.env.SYNC_INSERT_BATCH_SIZE ?? "50");

const IMAGE_FETCH_DELAY_MS = parseInt(
  process.env.SYNC_IMAGE_FETCH_DELAY_MS ?? "200",
);
let imageFetchGate: Promise<void> = Promise.resolve();

function throttleImageFetch(): Promise<void> {
  if (IMAGE_FETCH_DELAY_MS <= 0) return Promise.resolve();
  const previous = imageFetchGate;
  const thisTurn = previous.then(
    () =>
      new Promise<void>((resolve) => setTimeout(resolve, IMAGE_FETCH_DELAY_MS)),
  );
  imageFetchGate = thisTurn;
  return thisTurn;
}

function fetchSyncCardImage(source: SyncSource, url: string): Promise<Buffer> {
  return fetchPortraitCardImage(url, source.fetchHeaders, {
    runSignal: getAbortSignal(),
    waitForTurn: throttleImageFetch,
  });
}

async function fetchFrontFaceImage(
  source: SyncSource,
  card: SyncSourceCard,
  imageUrl: string,
): Promise<Buffer> {
  try {
    return await fetchSyncCardImage(source, imageUrl);
  } catch (err) {
    if (!card.fallbackImageUrl || card.fallbackImageUrl === imageUrl) throw err;
    addLog(
      `Image failed for ${card.name} (${errorMessage(err)}), using the TCGTracking image.`,
    );
    return fetchSyncCardImage(source, card.fallbackImageUrl);
  }
}

async function vectorizeFrontFace(
  source: SyncSource,
  lang: string,
  card: SyncSourceCard,
  imageUrl: string,
  data: unknown,
): Promise<VectorizedFrontFace> {
  const buffer = await fetchFrontFaceImage(source, card, imageUrl);
  const [{ embedding }, marks] = await Promise.all([
    vectorizeCardImage(buffer),
    readCatalogPrintingMarks(source.gameKey, lang, card.id, data, buffer),
  ]);
  return { embedding, marks };
}

function createSharedImageFrontFaceVectorizer(source: SyncSource, lang: string) {
  const sharesFrontFaces = !gameUsesPrintingMarks(source.gameKey);
  const frontFacesByImageUrl = new Map<string, Promise<VectorizedFrontFace>>();
  return (
    card: SyncSourceCard,
    imageUrl: string,
    data: unknown,
  ): Promise<VectorizedFrontFace> => {
    if (!sharesFrontFaces) {
      return vectorizeFrontFace(source, lang, card, imageUrl, data);
    }
    const shared = frontFacesByImageUrl.get(imageUrl);
    if (shared) return shared;
    const vectorized = vectorizeFrontFace(source, lang, card, imageUrl, data);
    frontFacesByImageUrl.set(imageUrl, vectorized);
    vectorized.catch(() => frontFacesByImageUrl.delete(imageUrl));
    if (frontFacesByImageUrl.size > SYNC_SHARED_FRONT_FACE_CACHE_MAX_IMAGES) {
      const oldestImageUrl = frontFacesByImageUrl.keys().next().value;
      if (oldestImageUrl !== undefined) frontFacesByImageUrl.delete(oldestImageUrl);
    }
    return vectorized;
  };
}

async function embedBackFace(
  source: SyncSource,
  card: SyncSourceCard,
): Promise<number[] | null> {
  if (!card.backImageUrl) return null;
  try {
    const buffer = await fetchSyncCardImage(source, card.backImageUrl);
    const { embedding } = await vectorizeCardImage(buffer);
    return embedding;
  } catch (err) {
    addLog(`Back face skipped: ${card.name}: ${errorMessage(err)}`);
    return null;
  }
}

async function refreshStoredData(
  source: SyncSource,
  lang: string,
  cards: SyncSourceCard[],
  storedCards: ReadonlyMap<string, StoredCardSyncState>,
): Promise<number> {
  if (cards.length === 0) return 0;
  addLog(`Checking stored data for ${cards.length} existing cards...`);

  const volatileDataKeys = source.volatileDataKeys ?? [];
  const volatileKeys = `{${volatileDataKeys.join(",")}}`;
  let updated = 0;
  let sent = 0;
  let changedRows: string[] = [];
  let changedHashes: { card_id: string; source_data_hash: string }[] = [];

  const flush = async () => {
    if (changedRows.length === 0) return;
    const rows = `[${changedRows.join(",")}]`;
    const hashes = JSON.stringify(changedHashes);
    sent += changedRows.length;
    changedRows = [];
    changedHashes = [];
    const result = await db.execute(sql`
      UPDATE cards AS c
      SET data = x.data, name = x.name, set_code = x.set_code,
        collector_number = x.collector_number,
        set_name = x.set_name, rarity = x.rarity, color_identity = x.color_identity,
        search_text = x.search_text, image_small = x.image_small,
        source_data_hash = x.source_data_hash, updated_at = now()
      FROM jsonb_to_recordset(${rows}::jsonb)
        AS x(card_id text, name text, set_code text, collector_number text, set_name text,
          rarity text, color_identity jsonb, search_text text, image_small text,
          source_data_hash text, data jsonb)
      WHERE c.game_key = ${source.gameKey}
        AND c.lang = ${lang}
        AND c.card_id = x.card_id
        AND (
          (c.data - ${volatileKeys}::text[]) IS DISTINCT FROM (x.data - ${volatileKeys}::text[])
          OR c.name IS DISTINCT FROM x.name
          OR c.set_code IS DISTINCT FROM x.set_code
          OR c.collector_number IS DISTINCT FROM x.collector_number
          OR (c.set_name, c.rarity, c.color_identity, c.search_text, c.image_small)
            IS DISTINCT FROM (x.set_name, x.rarity, x.color_identity, x.search_text, x.image_small)
        )
    `);
    updated += result.rowCount ?? 0;
    await db.execute(sql`
      UPDATE cards AS c
      SET source_data_hash = x.source_data_hash
      FROM jsonb_to_recordset(${hashes}::jsonb)
        AS x(card_id text, source_data_hash text)
      WHERE c.game_key = ${source.gameKey}
        AND c.lang = ${lang}
        AND c.card_id = x.card_id
        AND c.source_data_hash IS DISTINCT FROM x.source_data_hash
    `);
  };

  for (const card of cards) {
    if (isCancelled()) return updated;
    const row = buildCatalogCardRow({
      gameKey: source.gameKey,
      lang,
      cardId: card.id,
      name: card.name,
      setCode: card.setCode,
      data: JSON.parse(card.data),
    });
    const sourceDataHash = sourceDataHashOf(row, volatileDataKeys);
    if (storedCards.get(card.id)?.sourceDataHash === sourceDataHash) continue;
    changedRows.push(
      `{"card_id":${JSON.stringify(card.id)},"name":${JSON.stringify(row.name)},"set_code":${JSON.stringify(row.setCode)},"collector_number":${JSON.stringify(row.collectorNumber)},"set_name":${JSON.stringify(row.setName)},"rarity":${JSON.stringify(row.rarity)},"color_identity":${JSON.stringify(row.colorIdentity)},"search_text":${JSON.stringify(row.searchText)},"image_small":${JSON.stringify(row.imageSmall)},"source_data_hash":${JSON.stringify(sourceDataHash)},"data":${card.data}}`,
    );
    changedHashes.push({ card_id: card.id, source_data_hash: sourceDataHash });
    if (changedRows.length >= SYNC_DATA_REFRESH_BATCH_SIZE) await flush();
  }
  await flush();

  addLog(
    `Stored data checked (${sent} compared in the database, ${updated} changed).`,
  );
  return updated;
}

let printingMarkWrites: Promise<unknown> = Promise.resolve();

function oneMarkWriteAtATime<T>(write: () => Promise<T>): Promise<T> {
  const next = printingMarkWrites.then(write, write);
  printingMarkWrites = next.catch(() => undefined);
  return next;
}

async function storePrintingMarks(
  source: SyncSource,
  lang: string,
  cards: { cardId: string; marks: CatalogPrintingMarks | null }[],
  batch: PrintingMarkBatch,
): Promise<void> {
  const rows = JSON.stringify(
    cards.map(({ cardId, marks }) => ({
      card_id: cardId,
      ...printingMarkColumns(source.gameKey, marks),
    })),
  );
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE cards AS c
      SET printing_mark_groups = x."printingMarkGroups",
        printing_mark_version = x."printingMarkVersion"
      FROM jsonb_to_recordset(${rows}::jsonb)
        AS x(card_id text, "printingMarkGroups" jsonb, "printingMarkVersion" smallint)
      WHERE c.game_key = ${source.gameKey}
        AND c.lang = ${lang}
        AND c.card_id = x.card_id
    `);
    await persistPrintingMarkBatch(tx, source.gameKey, batch);
  });
}

async function backfillPrintingMarks(
  source: SyncSource,
  lang: string,
  cards: SyncSourceCard[],
): Promise<void> {
  if (!gameUsesPrintingMarks(source.gameKey)) return;
  const counted = await cardIdsWithCurrentPrintingMarks(source.gameKey, lang);
  const pending = cards.filter(
    (card) => card.imageUrl && !counted.has(card.id),
  );
  if (pending.length === 0) return;
  let stored = 0;
  let failed = 0;
  addLog(
    `Reading printing marks (set symbols, stamps) for ${pending.length} cards...`,
  );
  const reportProgress = () => {
    const progress = {
      printingMarksTotal: pending.length,
      printingMarksDone: stored,
      printingMarksFailed: failed,
    };
    patchState(progress);
    emitEvent("progress", progress);
  };
  reportProgress();

  let unsaved: { cardId: string; marks: CatalogPrintingMarks | null }[] = [];
  const flush = async (force: boolean) => {
    if (unsaved.length === 0) return;
    if (!force && unsaved.length < PRINTING_MARK_BACKFILL_UPDATE_BATCH_SIZE) {
      return;
    }
    const cardsToStore = unsaved;
    unsaved = [];
    const batch: PrintingMarkBatch = new Map();
    for (const { marks } of cardsToStore) addToPrintingMarkBatch(batch, marks);
    try {
      await oneMarkWriteAtATime(() =>
        storePrintingMarks(source, lang, cardsToStore, batch),
      );
      stored += cardsToStore.length;
      if (
        Math.floor(stored / PRINTING_MARK_PROGRESS_LOG_EVERY_CARDS) >
        Math.floor(
          (stored - cardsToStore.length) /
            PRINTING_MARK_PROGRESS_LOG_EVERY_CARDS,
        )
      ) {
        addLog(`Printing marks read for ${stored} of ${pending.length} cards.`);
      }
    } catch (err) {
      failed += cardsToStore.length;
      addLog(`Error storing printing marks: ${errorMessage(err)}`);
    }
    reportProgress();
  };

  let nextIndex = 0;
  const worker = async () => {
    for (;;) {
      if (isCancelled()) return;
      const card = pending[nextIndex++];
      if (!card?.imageUrl) return;
      try {
        const buffer = await fetchFrontFaceImage(
          source,
          card,
          card.printingMarkImageUrl ?? card.imageUrl,
        );
        unsaved.push({
          cardId: card.id,
          marks: await readCatalogPrintingMarks(
            source.gameKey,
            lang,
            card.id,
            JSON.parse(card.data),
            buffer,
          ),
        });
        await flush(false);
      } catch (err) {
        failed++;
        if (!isCancelled()) {
          addLog(`Printing marks skipped: ${card.name}: ${errorMessage(err)}`);
        }
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(VECTORIZE_CONCURRENCY, pending.length) },
      worker,
    ),
  );
  await flush(true);
  reportProgress();
  addLog(
    `Printing marks read for ${stored} cards${failed > 0 ? ` (${failed} failed)` : ""}.`,
  );
}

function emitCancelledDone(): void {
  patchState({ status: "cancelled" });
  addLog("Sync cancelled by user.");
  const syncState = getState();
  emitEvent("done", {
    status: "cancelled" as SyncStatus,
    processed: syncState.processed,
    skipped: syncState.skipped,
    errors: syncState.errors,
  });
}

async function pruneCardsDroppedFromSource(
  source: SyncSource,
  lang: string,
  storedCards: { id: string; name: string; setCode: string | null }[],
  fetchedCards: SyncSourceCard[],
): Promise<Set<string>> {
  const plan = planSyncPrune({
    storedCardIds: storedCards.map((card) => card.id),
    fetchedCardIds: new Set(fetchedCards.map((card) => card.id)),
    incompleteFetchReasons: syncFetchIncompleteReasons(),
    maxShareOfStoredCards: SYNC_PRUNE_MAX_SHARE_OF_STORED_CARDS,
  });
  if (plan.kind === "skip") {
    addLog(
      `Not removing ${plan.staleCardCount} stored ${source.label} cards missing from the source because ${plan.reason}.`,
    );
    return new Set();
  }
  if (plan.cardIdsToDelete.length === 0) return new Set();

  const cardIdsToDelete = new Set(plan.cardIdsToDelete);
  const removedNames = storedCards
    .filter((card) => cardIdsToDelete.has(card.id))
    .slice(0, SYNC_PRUNE_LOGGED_NAME_LIMIT)
    .map((card) => (card.setCode ? `${card.name} (${card.setCode})` : card.name));
  addLog(
    `Removing ${cardIdsToDelete.size} stored ${source.label} cards the source no longer lists: ${removedNames.join(", ")}${cardIdsToDelete.size > removedNames.length ? ", ..." : ""}`,
  );

  let removedCount = 0;
  for (let start = 0; start < plan.cardIdsToDelete.length; start += SYNC_PRUNE_DELETE_BATCH_SIZE) {
    const batch = plan.cardIdsToDelete.slice(start, start + SYNC_PRUNE_DELETE_BATCH_SIZE);
    const deleted = await db
      .delete(cardImageVectors)
      .where(
        and(
          eq(cardImageVectors.gameKey, source.gameKey),
          eq(cardImageVectors.lang, lang),
          inArray(cardImageVectors.cardId, batch),
        ),
      )
      .returning({ id: cardImageVectors.cardId });
    removedCount += deleted.length;
  }
  patchState({ removedCards: removedCount });
  return cardIdsToDelete;
}

async function runSync(
  source: SyncSource,
  lang: string,
  forceResync: boolean,
  skipUpdatedWithinMs: number | undefined,
  vectorizeOn: SyncVectorizeOn,
): Promise<void> {
  const baseUrl = source.defaultUrl;
  addLog(`Using data source: ${baseUrl}`);
  resetSyncFetchCompleteness();
  await dropOutdatedPrintingMarkReferences(source.gameKey);
  if (vectorizeOn === "browser" && forceResync) {
    addLog(
      "Force resync is ignored so this computer only vectorizes cards missing front or back image vectors.",
    );
    forceResync = false;
  }

  let cards: Awaited<ReturnType<SyncSource["fetchCards"]>>;
  try {
    cards = await source.fetchCards(baseUrl, addLog, lang, getAbortSignal());
  } catch (err) {
    if (isCancelled()) {
      emitCancelledDone();
      return;
    }
    throw err;
  }

  const uniqueCards = [...new Map(cards.map((c) => [c.id, c])).values()];
  if (uniqueCards.length !== cards.length) {
    addLog(
      `Removed ${cards.length - uniqueCards.length} duplicate card id(s) from ${source.label} data.`,
    );
  }
  cards = uniqueCards;

  patchState({ total: cards.length });
  emitEvent("status", getState());

  const noImageCount = cards.filter((c) => !c.imageUrl).length;
  if (noImageCount > 0) {
    addLog(
      `${noImageCount} of ${cards.length} ${source.label} cards have no image available and will be skipped.`,
    );
  }

  addLog(`Loading existing ${source.label} cards from DB...`);

  let existing = await db
    .select({
      id: cardImageVectors.cardId,
      name: cardImageVectors.name,
      setCode: cardImageVectors.setCode,
      updatedAt: cardImageVectors.updatedAt,
      hasBack: sql<boolean>`${cardImageVectors.backEmbedding} IS NOT NULL`,
      embeddingVersion: cardImageVectors.embeddingVersion,
      sourceDataHash: cardImageVectors.sourceDataHash,
    })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, source.gameKey),
        eq(cardImageVectors.lang, lang),
      ),
    );
  if (isCancelled()) {
    emitCancelledDone();
    return;
  }
  const prunedCardIds = await pruneCardsDroppedFromSource(
    source,
    lang,
    existing,
    cards,
  );
  if (prunedCardIds.size > 0) {
    existing = existing.filter((row) => !prunedCardIds.has(row.id));
  }

  const existingSet = new Set(existing.map((r) => r.id));
  const storedCards = new Map<string, StoredCardSyncState>(
    existing.map((r) => [
      r.id,
      {
        embeddingVersion: r.embeddingVersion,
        hasBackEmbedding: r.hasBack,
        sourceDataHash: r.sourceDataHash,
      },
    ]),
  );
  const outdatedEmbeddingCount = existing.filter(
    (r) => r.embeddingVersion < CARD_EMBEDDING_VERSION,
  ).length;

  const recentlyUpdated = new Set<string>();
  if (skipUpdatedWithinMs && skipUpdatedWithinMs > 0) {
    const cutoff = new Date(Date.now() - skipUpdatedWithinMs);
    for (const r of existing) {
      if (r.updatedAt >= cutoff) recentlyUpdated.add(r.id);
    }
  }

  addLog(
    `Found ${existingSet.size} existing ${source.label} cards in DB` +
      (forceResync
        ? " (force resync on - all will be reprocessed)" +
          (recentlyUpdated.size > 0
            ? `, except ${recentlyUpdated.size} updated within the last ${Math.round(skipUpdatedWithinMs! / 3_600_000)}h`
            : "")
        : "") +
      ".",
  );

  if (outdatedEmbeddingCount > 0 && vectorizeOn === "server") {
    addLog(
      `${outdatedEmbeddingCount} stored cards have image vectors from an older image normalization and will be vectorized again.`,
    );
  }

  const syncActionFor = (card: SyncSourceCard): CardSyncAction => {
    const stored = storedCards.get(card.id);
    if (card.hasPartialData && stored) return "skip";
    return planCardSync({
      hasImage: Boolean(card.imageUrl),
      hasBackImage: Boolean(card.backImageUrl),
      stored,
      forceResync,
      wasRecentlyUpdated: recentlyUpdated.has(card.id),
      currentEmbeddingVersion: CARD_EMBEDDING_VERSION,
      reembedsOutdatedEmbeddings: vectorizeOn === "server",
    });
  };
  const partialDataCount = cards.filter(
    (card) => card.hasPartialData && storedCards.has(card.id),
  ).length;
  if (partialDataCount > 0) {
    addLog(
      `${partialDataCount} stored cards came back without full details and keep their stored data this run.`,
    );
  }
  const cardsToRefresh = cards.filter(
    (card) =>
      storedCards.has(card.id) &&
      !card.hasPartialData &&
      syncActionFor(card) !== "embedBothFaces",
  );

  if (vectorizeOn === "browser") {
    const refreshedInBrowserMode = await refreshStoredData(
      source,
      lang,
      cardsToRefresh,
      storedCards,
    );
    patchState({ updatedCards: refreshedInBrowserMode });
    if (isCancelled()) {
      emitCancelledDone();
      return;
    }
    const needed: SyncSourceCard[] = [];
    let alreadyDone = 0;
    for (const card of cards) {
      if (syncActionFor(card) === "skip") alreadyDone++;
      else needed.push(card);
    }
    const allCards = cards;
    cards = [];
    const outcome = await serveBrowserQueue({
      source,
      lang,
      cards: needed,
      skipped: alreadyDone,
      addLog,
      patchState,
      incrementCounters,
      emitEvent,
      getState,
      isCancelled,
    });
    if (outcome === "cancelled" || isCancelled()) {
      emitCancelledDone();
      return;
    }
    patchState({ acceptingWork: false, queued: 0 });
    await backfillPrintingMarks(source, lang, allCards);
    if (isCancelled()) {
      emitCancelledDone();
      return;
    }
    patchState({ status: "completed", acceptingWork: false, queued: 0 });
    const finished = getState();
    addLog(
      `Done. Processed: ${finished.processed}, Skipped: ${finished.skipped}, Errors: ${finished.errors}`,
    );
    emitEvent("done", {
      status: "completed" as SyncStatus,
      acceptingWork: false,
      processed: finished.processed,
      skipped: finished.skipped,
      errors: finished.errors,
      queued: 0,
    });
    return;
  }

  const refreshed = await refreshStoredData(
    source,
    lang,
    cardsToRefresh,
    storedCards,
  );
  let newCardCount = 0;
  let updatedCardCount = refreshed;
  const newCardNames: string[] = [];
  patchState({ newCards: 0, updatedCards: updatedCardCount, newCardNames: [] });
  if (isCancelled()) {
    emitCancelledDone();
    return;
  }

  addLog(`Starting vectorization (${VECTORIZE_CONCURRENCY} in parallel)...`);

  let pendingInserts: (typeof cardImageVectors.$inferInsert)[] = [];
  let pendingCards: SyncSourceCard[] = [];
  let pendingMarks: (CatalogPrintingMarks | null)[] = [];
  const countedMarkCardIds = gameUsesPrintingMarks(source.gameKey)
    ? await cardIdsWithCurrentPrintingMarks(source.gameKey, lang)
    : new Set<string>();

  async function writeCardRows(
    rows: (typeof cardImageVectors.$inferInsert)[],
    rowCards: SyncSourceCard[],
    rowMarks: (CatalogPrintingMarks | null)[],
  ): Promise<void> {
    const markBatch: PrintingMarkBatch = new Map();
    rowCards.forEach((card, index) => {
      if (!countedMarkCardIds.has(card.id)) {
        addToPrintingMarkBatch(markBatch, rowMarks[index]);
      }
    });
    await oneMarkWriteAtATime(() =>
      db.transaction(async (tx) => {
        await tx
          .insert(cardImageVectors)
          .values(rows)
          .onConflictDoUpdate({
            target: [
              cardImageVectors.gameKey,
              cardImageVectors.lang,
              cardImageVectors.cardId,
            ],
            set: {
              name: sql`excluded.name`,
              setCode: sql`excluded.set_code`,
              collectorNumber: sql`excluded.collector_number`,
              embedding: sql`excluded.embedding`,
              backEmbedding: sql`excluded.back_embedding`,
              data: sql`excluded.data`,
              setName: sql`excluded.set_name`,
              rarity: sql`excluded.rarity`,
              colorIdentity: sql`excluded.color_identity`,
              searchText: sql`excluded.search_text`,
              imageSmall: sql`excluded.image_small`,
              printingMarkGroups: sql`excluded.printing_mark_groups`,
              printingMarkVersion: sql`excluded.printing_mark_version`,
              embeddingVersion: sql`excluded.embedding_version`,
              sourceDataHash: sql`excluded.source_data_hash`,
              updatedAt: sql`now()`,
            },
          });
        await persistPrintingMarkBatch(tx, source.gameKey, markBatch);
      }),
    );
    rowMarks.forEach((marks, index) => {
      if (marks) countedMarkCardIds.add(rowCards[index].id);
    });
    rows.forEach((row, index) => {
      storedCards.set(rowCards[index].id, {
        embeddingVersion: CARD_EMBEDDING_VERSION,
        hasBackEmbedding: row.backEmbedding != null,
        sourceDataHash: row.sourceDataHash ?? null,
      });
    });
  }

  function countStoredCard(card: SyncSourceCard): void {
    if (existingSet.has(card.id)) {
      updatedCardCount++;
    } else {
      newCardCount++;
      if (newCardNames.length < SYNC_NEW_CARD_NAME_LIMIT) {
        newCardNames.push(
          card.setCode ? `${card.name} (${card.setCode})` : card.name,
        );
      }
    }
    existingSet.add(card.id);
  }

  async function flushInserts(force = false): Promise<void> {
    if (pendingInserts.length === 0) return;
    if (!force && pendingInserts.length < INSERT_BATCH_SIZE) return;
    const batchRows = pendingInserts;
    const batchCards = pendingCards;
    const batchMarks = pendingMarks;
    pendingInserts = [];
    pendingCards = [];
    pendingMarks = [];
    patchState({ queued: 0 });
    addLog(`Inserting batch of ${batchCards.length} cards...`);

    let writtenCards = batchCards;
    try {
      await writeCardRows(batchRows, batchCards, batchMarks);
    } catch (err) {
      writtenCards = [];
      if (batchCards.length === 1) {
        addLog(`Error inserting ${batchCards[0].name}: ${errorMessage(err)}`);
      } else {
        addLog(
          `Batch of ${batchCards.length} cards failed (${errorMessage(err)}); inserting them one at a time.`,
        );
        for (let index = 0; index < batchCards.length; index++) {
          try {
            await writeCardRows(
              [batchRows[index]],
              [batchCards[index]],
              [batchMarks[index]],
            );
            writtenCards.push(batchCards[index]);
          } catch (rowErr) {
            addLog(
              `Error inserting ${batchCards[index].name}: ${errorMessage(rowErr)}`,
            );
          }
        }
      }
    }

    writtenCards.forEach(countStoredCard);
    patchState({
      newCards: newCardCount,
      updatedCards: updatedCardCount,
      newCardNames: [...newCardNames],
    });
    incrementCounters({
      processed: writtenCards.length,
      errors: batchCards.length - writtenCards.length,
    });
    const syncState = getState();
    addLog(
      `[${syncState.processed + syncState.skipped}/${syncState.total}] inserted ${writtenCards.length} of ${batchCards.length} cards`,
    );
    emitEvent("progress", {
      processed: syncState.processed,
      skipped: syncState.skipped,
      errors: syncState.errors,
      queued: syncState.queued,
    });
  }

  async function storeBackFaceOnly(card: SyncSourceCard): Promise<void> {
    const backEmbedding = await embedBackFace(source, card);
    if (!backEmbedding) {
      incrementCounters({ errors: 1 });
      return;
    }
    await db
      .update(cardImageVectors)
      .set({ backEmbedding, updatedAt: sql`now()` })
      .where(
        and(
          eq(cardImageVectors.gameKey, source.gameKey),
          eq(cardImageVectors.lang, lang),
          eq(cardImageVectors.cardId, card.id),
        ),
      );
    const stored = storedCards.get(card.id);
    if (stored) storedCards.set(card.id, { ...stored, hasBackEmbedding: true });
    updatedCardCount++;
    patchState({ updatedCards: updatedCardCount });
    incrementCounters({ processed: 1 });
  }

  const vectorizeSharedImageFrontFace = createSharedImageFrontFaceVectorizer(
    source,
    lang,
  );

  async function processCard(card: SyncSourceCard): Promise<void> {
    const action = syncActionFor(card);
    if (action === "skip" || !card.imageUrl) {
      incrementCounters({ skipped: 1 });
      const syncState = getState();
      emitEvent("progress", {
        processed: syncState.processed,
        skipped: syncState.skipped,
        errors: syncState.errors,
        currentCard: card.name,
      });
      return;
    }

    try {
      if (action === "embedBackFaceOnly") {
        await storeBackFaceOnly(card);
      } else {
        const data: unknown = JSON.parse(card.data);
        const [{ embedding, marks }, backEmbedding] = await Promise.all([
          vectorizeSharedImageFrontFace(card, card.imageUrl, data),
          embedBackFace(source, card),
        ]);
        const row = buildCatalogCardRow({
          gameKey: source.gameKey,
          lang,
          cardId: card.id,
          name: card.name,
          setCode: card.setCode,
          data,
        });
        pendingInserts.push({
          ...row,
          embedding,
          backEmbedding,
          embeddingVersion: CARD_EMBEDDING_VERSION,
          sourceDataHash: sourceDataHashOf(row, source.volatileDataKeys ?? []),
          ...printingMarkColumns(source.gameKey, marks),
        });
        pendingCards.push(card);
        pendingMarks.push(marks);
        patchState({ queued: pendingCards.length });
        await flushInserts();
      }

      const syncState = getState();
      emitEvent("progress", {
        processed: syncState.processed,
        skipped: syncState.skipped,
        errors: syncState.errors,
        queued: syncState.queued,
        currentCard: card.name,
      });
    } catch (err) {
      incrementCounters({ errors: 1 });
      const msg = errorMessage(err);
      addLog(`Error: ${card.name}: ${msg}`);
      const syncState = getState();
      emitEvent("progress", {
        processed: syncState.processed,
        skipped: syncState.skipped,
        errors: syncState.errors,
        currentCard: card.name,
      });
    }
  }

  let nextIndex = 0;
  let cancelled = false;

  async function worker(): Promise<void> {
    for (;;) {
      if (isCancelled()) {
        cancelled = true;
        return;
      }
      const index = nextIndex++;
      if (index >= cards.length) return;
      await processCard(cards[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(VECTORIZE_CONCURRENCY, cards.length) },
      worker,
    ),
  );

  await flushInserts(true);

  if (cancelled) {
    emitCancelledDone();
    return;
  }

  await backfillPrintingMarks(source, lang, cards);
  if (isCancelled()) {
    emitCancelledDone();
    return;
  }

  patchState({ status: "completed" });
  const syncState = getState();
  addLog(
    `Done. Processed: ${syncState.processed}, Skipped: ${syncState.skipped}, Errors: ${syncState.errors}`,
  );
  emitEvent("done", {
    status: "completed" as SyncStatus,
    processed: syncState.processed,
    skipped: syncState.skipped,
    errors: syncState.errors,
  });
}

process.on("message", (msg: ParentToWorkerMessage) => {
  if (msg.type === "cancel") {
    cancelFlag = true;
    abortController?.abort();
    cancelBrowserQueue();
    return;
  }

  if (msg.type === "claim") {
    send({
      type: "workResponse",
      requestId: msg.requestId,
      ok: true,
      cards: claimBrowserWork(msg.limit),
    });
    return;
  }

  if (msg.type === "submit") {
    void submitBrowserWork(msg.results, msg.failures)
      .then((state) => {
        send(
          { type: "workResponse", requestId: msg.requestId, ok: true },
          () => {
            if (state === "cancelled") finishBrowserQueue("cancelled");
            else if (state === "idle") finishBrowserQueue("done");
          },
        );
      })
      .catch((err) => {
        send({
          type: "workResponse",
          requestId: msg.requestId,
          ok: false,
          message: errorMessage(err),
        });
      });
    return;
  }

  if (msg.type === "start") {
    state = msg.initialState;
    const source = SYNC_SOURCES[msg.gameKey];
    if (!source) {
      process.exit(1);
    }

    beginRun();
    runSync(
      source,
      msg.lang,
      msg.forceResync,
      msg.skipUpdatedWithinMs,
      msg.vectorizeOn,
    )
      .then(() => exitAfterFlush(0))
      .catch((err) => {
        const errMsg = errorMessage(err);
        patchState({ status: "failed", fatalError: errMsg });
        addLog(`Fatal error: ${errMsg}`);
        emitEvent("error", { message: errMsg });
        exitAfterFlush(1);
      });
  }
});
