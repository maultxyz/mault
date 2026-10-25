import type { SyncState, SyncStatus } from "@magic-vault/shared";
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
import type { ParentToWorkerMessage, WorkerToParentMessage } from "../interfaces/sync-job";
import { SYNC_SOURCES } from "./sources";
import { storedCollectorNumber } from "../card-search/collector-number";
import { rebuildGameVectorIndex } from "../game-vector-index";

function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = err.cause instanceof Error ? err.cause.message : null;
  return cause ? `${err.message}: ${cause}` : err.message;
}

function send(msg: WorkerToParentMessage): void {
  process.send?.(msg);
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
    ...s,
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

async function embedCardImageUrl(
  source: SyncSource,
  url: string,
): Promise<number[]> {
  await throttleImageFetch();
  const imageRes = await fetch(url, {
    headers: source.fetchHeaders,
    signal: getAbortSignal(),
  });
  if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
  const buffer = await toPortraitCardImage(
    Buffer.from(await imageRes.arrayBuffer()),
  );
  const { embedding } = await vectorizeCardImage(buffer);
  return embedding;
}

async function embedBackFace(
  source: SyncSource,
  card: SyncSourceCard,
): Promise<number[] | null> {
  if (!card.backImageUrl) return null;
  try {
    return await embedCardImageUrl(source, card.backImageUrl);
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
        const collectorNumber = storedCollectorNumber(
          source.gameKey,
          lang,
          c.id,
          JSON.parse(c.data),
        );
        return `{"card_id":${JSON.stringify(c.id)},"collector_number":${JSON.stringify(collectorNumber)},"data":${c.data}}`;
      })
      .join(",")}]`;
    const result = await db.execute(sql`
      UPDATE cards AS c
      SET data = x.data, collector_number = x.collector_number
      FROM jsonb_to_recordset(${rows}::jsonb)
        AS x(card_id text, collector_number text, data jsonb)
      WHERE c.game_key = ${source.gameKey}
        AND c.lang = ${lang}
        AND c.card_id = x.card_id
        AND (
          (c.data - ${volatileKeys}::text[]) IS DISTINCT FROM (x.data - ${volatileKeys}::text[])
          OR c.collector_number IS DISTINCT FROM x.collector_number
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
  skipUpdatedWithinMs?: number,
): Promise<void> {
  const baseUrl = source.defaultUrl;
  addLog(`Using data source: ${baseUrl}`);

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

  // `processed`/`errors` must only advance once a batch's INSERT has been
  // confirmed - incrementing them as soon as a card was *queued* let a
  // failed batch INSERT silently lose every other card queued alongside the
  // one worker that happened to await it, while the UI still reported them
  // all as processed.
  async function flushInserts(force = false): Promise<void> {
    if (pendingInserts.length === 0) return;
    if (!force && pendingInserts.length < INSERT_BATCH_SIZE) return;
    const batchRows = pendingInserts;
    const batchCards = pendingCards;
    pendingInserts = [];
    pendingCards = [];
    patchState({ queued: 0 });
    addLog(`Inserting batch of ${batchCards.length} cards...`);

    try {
      await db
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
            updatedAt: sql`now()`,
          },
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
      const embedding = await embedCardImageUrl(source, card.imageUrl);
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
      });
      pendingCards.push(card);
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
    return;
  }

  if (msg.type === "start") {
    state = msg.initialState;
    const source = SYNC_SOURCES[msg.gameKey];
    if (!source) {
      process.exit(1);
    }

    beginRun();
    runSync(source, msg.lang, msg.forceResync, msg.skipUpdatedWithinMs)
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
