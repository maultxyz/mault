import type {
  SyncState,
  SyncStatus,
  SyncVectorizeOn,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import type { SyncSource, SyncSourceCard } from "../interfaces/card-search";
import {
  SYNC_DATA_REFRESH_BATCH_SIZE,
  SYNC_REINDEX_MIN_CHANGED_FRACTION,
} from "../constants/sync";
import { toPortraitCardImage } from "../card-image";
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
import { storedCollectorNumber } from "../card-search/collector-number";
import { catalogColumnsFor } from "../card-catalog";
import { rebuildGameVectorIndex } from "../game-vector-index";
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
import type { VectorizedFrontFace } from "../interfaces/sync-job";

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

async function fetchPortraitCardImage(
  source: SyncSource,
  url: string,
): Promise<Buffer> {
  await throttleImageFetch();
  const imageRes = await fetch(url, {
    headers: source.fetchHeaders,
    signal: getAbortSignal(),
  });
  if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
  return toPortraitCardImage(Buffer.from(await imageRes.arrayBuffer()));
}

async function fetchFrontFaceImage(
  source: SyncSource,
  card: SyncSourceCard,
  imageUrl: string,
): Promise<Buffer> {
  try {
    return await fetchPortraitCardImage(source, imageUrl);
  } catch (err) {
    if (!card.fallbackImageUrl || card.fallbackImageUrl === imageUrl) throw err;
    addLog(
      `Image failed for ${card.name} (${errorMessage(err)}), using the TCGTracking image.`,
    );
    return fetchPortraitCardImage(source, card.fallbackImageUrl);
  }
}

async function vectorizeFrontFace(
  source: SyncSource,
  lang: string,
  card: SyncSourceCard,
  imageUrl: string,
): Promise<VectorizedFrontFace> {
  const buffer = await fetchFrontFaceImage(source, card, imageUrl);
  const [{ embedding }, marks] = await Promise.all([
    vectorizeCardImage(buffer),
    readCatalogPrintingMarks(
      source.gameKey,
      lang,
      card.id,
      JSON.parse(card.data),
      buffer,
    ),
  ]);
  return { embedding, marks };
}

async function embedBackFace(
  source: SyncSource,
  card: SyncSourceCard,
): Promise<number[] | null> {
  if (!card.backImageUrl) return null;
  try {
    const buffer = await fetchPortraitCardImage(source, card.backImageUrl);
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
): Promise<number> {
  if (cards.length === 0) return 0;
  addLog(`Refreshing stored data for ${cards.length} existing cards...`);

  const volatileKeys = `{${(source.volatileDataKeys ?? []).join(",")}}`;
  let updated = 0;
  for (let i = 0; i < cards.length; i += SYNC_DATA_REFRESH_BATCH_SIZE) {
    if (isCancelled()) return updated;
    const batch = cards.slice(i, i + SYNC_DATA_REFRESH_BATCH_SIZE);
    const rows = `[${batch
      .map((c) => {
        const data: unknown = JSON.parse(c.data);
        const collectorNumber = storedCollectorNumber(
          source.gameKey,
          lang,
          c.id,
          data,
        );
        const catalog = catalogColumnsFor(source.gameKey, lang, c.id, data);
        return `{"card_id":${JSON.stringify(c.id)},"collector_number":${JSON.stringify(collectorNumber)},"set_name":${JSON.stringify(catalog.setName)},"rarity":${JSON.stringify(catalog.rarity)},"color_identity":${JSON.stringify(catalog.colorIdentity)},"search_text":${JSON.stringify(catalog.searchText)},"image_small":${JSON.stringify(catalog.imageSmall)},"data":${c.data}}`;
      })
      .join(",")}]`;
    const result = await db.execute(sql`
      UPDATE cards AS c
      SET data = x.data, collector_number = x.collector_number,
        set_name = x.set_name, rarity = x.rarity, color_identity = x.color_identity,
        search_text = x.search_text, image_small = x.image_small
      FROM jsonb_to_recordset(${rows}::jsonb)
        AS x(card_id text, collector_number text, set_name text, rarity text,
          color_identity jsonb, search_text text, image_small text, data jsonb)
      WHERE c.game_key = ${source.gameKey}
        AND c.lang = ${lang}
        AND c.card_id = x.card_id
        AND (
          (c.data - ${volatileKeys}::text[]) IS DISTINCT FROM (x.data - ${volatileKeys}::text[])
          OR c.collector_number IS DISTINCT FROM x.collector_number
          OR (c.set_name, c.rarity, c.color_identity, c.search_text, c.image_small)
            IS DISTINCT FROM (x.set_name, x.rarity, x.color_identity, x.search_text, x.image_small)
        )
    `);
    updated += result.rowCount ?? 0;
  }

  addLog(`Stored data refreshed (${updated} changed).`);
  return updated;
}

async function rebuildVectorIndexIfChurned(
  source: SyncSource,
  lang: string,
  changed: number,
  total: number,
): Promise<void> {
  if (total === 0 || changed < total * SYNC_REINDEX_MIN_CHANGED_FRACTION) {
    return;
  }
  addLog(
    `${changed} of ${total} cards changed, rebuilding the vector index...`,
  );
  try {
    const indexName = await rebuildGameVectorIndex(source.gameKey, lang);
    addLog(
      indexName
        ? `Rebuilt vector index ${indexName}.`
        : "No vector index found for this game and language, skipped rebuild.",
    );
  } catch (err) {
    addLog(`Vector index rebuild failed: ${errorMessage(err)}`);
  }
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

async function runSync(
  source: SyncSource,
  lang: string,
  forceResync: boolean,
  skipUpdatedWithinMs: number | undefined,
  vectorizeOn: SyncVectorizeOn,
): Promise<void> {
  const baseUrl = source.defaultUrl;
  addLog(`Using data source: ${baseUrl}`);
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

  const existing = await db
    .select({
      id: cardImageVectors.cardId,
      updatedAt: cardImageVectors.updatedAt,
      hasBack: sql<boolean>`${cardImageVectors.backEmbedding} IS NOT NULL`,
    })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, source.gameKey),
        eq(cardImageVectors.lang, lang),
      ),
    );
  const existingSet = new Set(existing.map((r) => r.id));
  const vectorizedBacks = new Set(
    existing.filter((r) => r.hasBack).map((r) => r.id),
  );

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

  const isAlreadyVectorized = (card: SyncSourceCard) =>
    (!forceResync &&
      existingSet.has(card.id) &&
      (!card.backImageUrl || vectorizedBacks.has(card.id))) ||
    recentlyUpdated.has(card.id);

  if (vectorizeOn === "browser") {
    await refreshStoredData(source, lang, cards.filter(isAlreadyVectorized));
    if (isCancelled()) {
      emitCancelledDone();
      return;
    }
    const needed: SyncSourceCard[] = [];
    let alreadyDone = 0;
    for (const card of cards) {
      if (!card.imageUrl || isAlreadyVectorized(card)) alreadyDone++;
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
    cards.filter(isAlreadyVectorized),
  );
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

  async function flushInserts(force = false): Promise<void> {
    if (pendingInserts.length === 0) return;
    if (!force && pendingInserts.length < INSERT_BATCH_SIZE) return;
    const batchRows = pendingInserts;
    const batchCards = pendingCards;
    const batchMarks = pendingMarks;
    pendingInserts = [];
    pendingCards = [];
    pendingMarks = [];
    const markBatch: PrintingMarkBatch = new Map();
    batchCards.forEach((card, index) => {
      if (!countedMarkCardIds.has(card.id)) {
        addToPrintingMarkBatch(markBatch, batchMarks[index]);
      }
    });
    patchState({ queued: 0 });
    addLog(`Inserting batch of ${batchCards.length} cards...`);

    try {
      await oneMarkWriteAtATime(() =>
        db.transaction(async (tx) => {
          await tx
            .insert(cardImageVectors)
            .values(batchRows)
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
                updatedAt: sql`now()`,
              },
            });
          await persistPrintingMarkBatch(tx, source.gameKey, markBatch);
        }),
      );
      batchMarks.forEach((marks, index) => {
        if (marks) countedMarkCardIds.add(batchCards[index].id);
      });
      for (const c of batchCards) {
        existingSet.add(c.id);
        if (c.backImageUrl) vectorizedBacks.add(c.id);
      }
      incrementCounters({ processed: batchCards.length });
      const syncState = getState();
      addLog(
        `[${syncState.processed + syncState.skipped}/${syncState.total}] inserted batch of ${batchCards.length} cards`,
      );
    } catch (err) {
      incrementCounters({ errors: batchCards.length });
      const msg = errorMessage(err);
      addLog(`Error inserting batch of ${batchCards.length} cards: ${msg}`);
    }

    const syncState = getState();
    emitEvent("progress", {
      processed: syncState.processed,
      skipped: syncState.skipped,
      errors: syncState.errors,
      queued: syncState.queued,
    });
  }

  async function processCard(card: SyncSourceCard): Promise<void> {
    if (!card.imageUrl || isAlreadyVectorized(card)) {
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
      const { embedding, marks } = await vectorizeFrontFace(
        source,
        lang,
        card,
        card.imageUrl,
      );
      const backEmbedding = await embedBackFace(source, card);
      const data: unknown = JSON.parse(card.data);

      pendingInserts.push({
        cardId: card.id,
        gameKey: source.gameKey,
        lang,
        name: card.name,
        setCode: card.setCode,
        collectorNumber: storedCollectorNumber(
          source.gameKey,
          lang,
          card.id,
          data,
        ),
        embedding,
        backEmbedding,
        data,
        ...catalogColumnsFor(source.gameKey, lang, card.id, data),
        ...printingMarkColumns(source.gameKey, marks),
      });
      pendingCards.push(card);
      pendingMarks.push(marks);
      patchState({ queued: pendingCards.length });
      await flushInserts();

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

  await rebuildVectorIndexIfChurned(
    source,
    lang,
    refreshed + getState().processed,
    existingSet.size,
  );

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
        patchState({ status: "failed" });
        const errMsg = errorMessage(err);
        addLog(`Fatal error: ${errMsg}`);
        emitEvent("error", { message: errMsg });
        exitAfterFlush(1);
      });
  }
});
