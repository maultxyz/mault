import type { SyncState, SyncStatus } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { cardImageVectors } from "../db/schema";
import type { SyncSource, SyncSourceCard } from "./card-search/sync-types";
import { sendDiscordNotification } from "./discord";
import { fabSyncSource } from "./fab/sync";
import { gundamSyncSource } from "./gundam/sync";
import { lorcanaSyncSource } from "./lorcana/sync";
import { onePieceSyncSource } from "./onepiece/sync";
import { pokemonSyncSource } from "./pokemon/sync";
import { scryfallSyncSource } from "./scryfall/sync";
import { vectorizeImageFromBuffer } from "./vectorize";
import { yugiohSyncSource } from "./yugioh/sync";

export const SYNC_SOURCES: Record<string, SyncSource> = {
  mtg: scryfallSyncSource,
  gundam: gundamSyncSource,
  pokemon: pokemonSyncSource,
  lorcana: lorcanaSyncSource,
  onepiece: onePieceSyncSource,
  fab: fabSyncSource,
  yugioh: yugiohSyncSource,
};

type SseWriter = (event: string, data: unknown) => void;

let state: SyncState = {
  status: "idle",
  gameKey: "",
  lang: "en",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

let cancelFlag = false;
let abortController: AbortController | null = null;
const writers = new Set<SseWriter>();

function addLog(msg: string) {
  state = { ...state, logs: [...state.logs.slice(-199), msg] };
  emit("log", { line: msg });
}

function emit(event: string, data: unknown) {
  for (const writer of writers) {
    try {
      writer(event, data);
    } catch {}
  }
}

export function getStatus(): SyncState {
  return { ...state, logs: [...state.logs] };
}

export function subscribeSSE(writer: SseWriter): () => void {
  writers.add(writer);
  writer("status", getStatus());
  return () => writers.delete(writer);
}

export function cancelSync(): void {
  if (state.status === "running") {
    cancelFlag = true;
    abortController?.abort();
  }
}

export function startSync(
  orgId: string | undefined,
  gameKey: string,
  lang: string = "en",
): void {
  if (state.status === "running") return;

  const source = SYNC_SOURCES[gameKey];
  if (!source) return;
  if (!source.languages.includes(lang)) return;

  cancelFlag = false;
  abortController = new AbortController();
  state = {
    status: "running",
    gameKey,
    lang,
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    logs: [],
  };

  emit("status", getStatus());
  runSync(source, lang).catch((err) => {
    state = { ...state, status: "failed" };
    const msg = err instanceof Error ? err.message : String(err);
    addLog(`Fatal error: ${msg}`);
    emit("error", { message: msg });
    if (orgId) {
      void sendDiscordNotification(
        orgId,
        {
          title: "Magic Vault — Sync Failed",
          description: `The card database sync job encountered a fatal error.\n\n**Error:** ${msg}`,
          color: 0xed4245,
          timestamp: new Date().toISOString(),
        },
        "error",
      );
    }
  });
}

const VECTORIZE_CONCURRENCY = parseInt(
  process.env.VECTORIZE_CONCURRENCY ?? "10",
);
const INSERT_BATCH_SIZE = parseInt(
  process.env.SYNC_INSERT_BATCH_SIZE ?? "50",
);

async function runSync(source: SyncSource, lang: string): Promise<void> {
  const baseUrl = source.defaultUrl;
  addLog(`Using data source: ${baseUrl}`);

  let cards: Awaited<ReturnType<SyncSource["fetchCards"]>>;
  try {
    cards = await source.fetchCards(
      baseUrl,
      addLog,
      lang,
      abortController?.signal,
    );
  } catch (err) {
    if (cancelFlag) {
      state = { ...state, status: "cancelled" };
      addLog("Sync cancelled by user.");
      emit("done", {
        status: "cancelled" as SyncStatus,
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
      });
      return;
    }
    throw err;
  }
  state = { ...state, total: cards.length };
  emit("status", getStatus());

  const noImageCount = cards.filter((c) => !c.imageUrl).length;
  if (noImageCount > 0) {
    addLog(
      `${noImageCount} of ${cards.length} ${source.label} cards have no image available and will be skipped.`,
    );
  }

  addLog(`Loading existing ${source.label} cards from DB...`);

  const existing = await db
    .select({ id: cardImageVectors.cardId })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, source.gameKey),
        eq(cardImageVectors.lang, lang),
      ),
    );
  const existingSet = new Set(existing.map((r) => r.id));

  addLog(
    `Found ${existingSet.size} existing ${source.label} cards in DB. Starting vectorization (${VECTORIZE_CONCURRENCY} in parallel)...`,
  );

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

    try {
      await db.insert(cardImageVectors).values(batchRows).onConflictDoNothing();
      for (const c of batchCards) existingSet.add(c.id);
      state = { ...state, processed: state.processed + batchCards.length };
      addLog(
        `[${state.processed + state.skipped}/${state.total}] inserted batch of ${batchCards.length} cards`,
      );
    } catch (err) {
      state = { ...state, errors: state.errors + batchCards.length };
      const msg = err instanceof Error ? err.message : String(err);
      addLog(
        `Error inserting batch of ${batchCards.length} cards: ${msg}`,
      );
    }

    emit("progress", {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    });
  }

  async function processCard(card: SyncSourceCard): Promise<void> {
    if (!card.imageUrl || existingSet.has(card.id)) {
      state = { ...state, skipped: state.skipped + 1 };
      emit("progress", {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
        currentCard: card.name,
      });
      return;
    }

    try {
      const imageRes = await fetch(card.imageUrl, {
        headers: source.fetchHeaders,
        signal: abortController?.signal,
      });
      if (!imageRes.ok)
        throw new Error(`Image fetch failed: ${imageRes.status}`);
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const embedding = await vectorizeImageFromBuffer(buffer);

      pendingInserts.push({
        cardId: card.id,
        gameKey: source.gameKey,
        lang,
        name: card.name,
        setCode: card.setCode,
        embedding,
      });
      pendingCards.push(card);
      await flushInserts();

      emit("progress", {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
        currentCard: card.name,
      });
    } catch (err) {
      state = { ...state, errors: state.errors + 1 };
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${card.name}: ${msg}`);
      emit("progress", {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
        currentCard: card.name,
      });
    }
  }

  let nextIndex = 0;
  let cancelled = false;

  async function worker(): Promise<void> {
    for (;;) {
      if (cancelFlag) {
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
    state = { ...state, status: "cancelled" };
    addLog("Sync cancelled by user.");
    emit("done", {
      status: "cancelled" as SyncStatus,
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    });
    return;
  }

  state = { ...state, status: "completed" };
  addLog(
    `Done. Processed: ${state.processed}, Skipped: ${state.skipped}, Errors: ${state.errors}`,
  );
  emit("done", {
    status: "completed" as SyncStatus,
    processed: state.processed,
    skipped: state.skipped,
    errors: state.errors,
  });
}
