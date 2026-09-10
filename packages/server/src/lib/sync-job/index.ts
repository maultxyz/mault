import type { SyncStatus } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { fabSyncSource } from "../adapters/fab/sync";
import { gundamSyncSource } from "../adapters/gundam/sync";
import { lorcanaSyncSource } from "../adapters/lorcana/sync";
import { onePieceSyncSource } from "../adapters/onepiece/sync";
import { pokemonSyncSource } from "../adapters/pokemon/sync";
import { riftboundSyncSource } from "../adapters/riftbound/sync";
import { scryfallSyncSource } from "../adapters/scryfall/sync";
import { yugiohSyncSource } from "../adapters/yugioh/sync";
import type { SyncSource, SyncSourceCard } from "../card-search/sync-types";
import { sendDiscordNotification } from "../discord";
import { vectorizeImageFromBuffer } from "../vectorize";
import {
  addLog,
  beginRun,
  cancelSync,
  emitEvent,
  getAbortSignal,
  getState,
  getStatus,
  incrementCounters,
  isCancelled,
  patchState,
  resetState,
  subscribeSSE,
} from "./state";

export { cancelSync, getStatus, subscribeSSE };

export const SYNC_SOURCES: Record<string, SyncSource> = {
  mtg: scryfallSyncSource,
  gundam: gundamSyncSource,
  pokemon: pokemonSyncSource,
  lorcana: lorcanaSyncSource,
  onepiece: onePieceSyncSource,
  fab: fabSyncSource,
  yugioh: yugiohSyncSource,
  riftbound: riftboundSyncSource,
};

export function startSync(
  orgId: string | undefined,
  gameKey: string,
  lang: string = "en",
): void {
  if (getState().status === "running") return;

  const source = SYNC_SOURCES[gameKey];
  if (!source) return;
  if (!source.languages.includes(lang)) return;

  beginRun();
  resetState({
    status: "running",
    gameKey,
    lang,
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    logs: [],
  });

  runSync(source, lang).catch((err) => {
    patchState({ status: "failed" });
    const msg = err instanceof Error ? err.message : String(err);
    addLog(`Fatal error: ${msg}`);
    emitEvent("error", { message: msg });
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

function emitCancelledDone(): void {
  patchState({ status: "cancelled" });
  addLog("Sync cancelled by user.");
  const s = getState();
  emitEvent("done", {
    status: "cancelled" as SyncStatus,
    processed: s.processed,
    skipped: s.skipped,
    errors: s.errors,
  });
}

async function runSync(source: SyncSource, lang: string): Promise<void> {
  const baseUrl = source.defaultUrl;
  addLog(`Using data source: ${baseUrl}`);

  let cards: Awaited<ReturnType<SyncSource["fetchCards"]>>;
  try {
    cards = await source.fetchCards(
      baseUrl,
      addLog,
      lang,
      getAbortSignal(),
    );
  } catch (err) {
    if (isCancelled()) {
      emitCancelledDone();
      return;
    }
    throw err;
  }
  patchState({ total: cards.length });
  emitEvent("status", getStatus());

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
      incrementCounters({ processed: batchCards.length });
      const s = getState();
      addLog(
        `[${s.processed + s.skipped}/${s.total}] inserted batch of ${batchCards.length} cards`,
      );
    } catch (err) {
      incrementCounters({ errors: batchCards.length });
      const msg = err instanceof Error ? err.message : String(err);
      addLog(
        `Error inserting batch of ${batchCards.length} cards: ${msg}`,
      );
    }

    const s = getState();
    emitEvent("progress", {
      processed: s.processed,
      skipped: s.skipped,
      errors: s.errors,
    });
  }

  async function processCard(card: SyncSourceCard): Promise<void> {
    if (!card.imageUrl || existingSet.has(card.id)) {
      incrementCounters({ skipped: 1 });
      const s = getState();
      emitEvent("progress", {
        processed: s.processed,
        skipped: s.skipped,
        errors: s.errors,
        currentCard: card.name,
      });
      return;
    }

    try {
      const imageRes = await fetch(card.imageUrl, {
        headers: source.fetchHeaders,
        signal: getAbortSignal(),
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

      const s = getState();
      emitEvent("progress", {
        processed: s.processed,
        skipped: s.skipped,
        errors: s.errors,
        currentCard: card.name,
      });
    } catch (err) {
      incrementCounters({ errors: 1 });
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${card.name}: ${msg}`);
      const s = getState();
      emitEvent("progress", {
        processed: s.processed,
        skipped: s.skipped,
        errors: s.errors,
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

  patchState({ status: "completed" });
  const s = getState();
  addLog(
    `Done. Processed: ${s.processed}, Skipped: ${s.skipped}, Errors: ${s.errors}`,
  );
  emitEvent("done", {
    status: "completed" as SyncStatus,
    processed: s.processed,
    skipped: s.skipped,
    errors: s.errors,
  });
}
