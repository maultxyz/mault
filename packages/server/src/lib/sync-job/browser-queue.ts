import { CARD_EMBEDDING_DIMENSIONS, SYNC_VECTORIZE_CONCURRENCY_MAX } from "@magic-vault/shared";
import type {
  BrowserSyncWorkCard,
  BrowserSyncWorkFailure,
  BrowserSyncWorkResult,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { storedCollectorNumber } from "../card-search/collector-number";
import {
  BROWSER_SYNC_LEASE_MS,
  BROWSER_SYNC_MAX_ATTEMPTS,
} from "../constants/sync";
import type { AcceptedBrowserWork, BrowserQueueHost, QueueState, QueuedCard } from "../interfaces/sync-job";

let queue: QueueState | null = null;

function outstanding(): number {
  if (!queue) return 0;
  return queue.pending.length + queue.leased.size;
}

function report(currentCard?: string): void {
  if (!queue) return;
  const queued = outstanding();
  queue.host.patchState({ queued, ...(currentCard ? { currentCard } : {}) });
  const s = queue.host.getState();
  queue.host.emitEvent("progress", {
    processed: s.processed,
    skipped: s.skipped,
    errors: s.errors,
    queued,
    currentCard: currentCard ?? s.currentCard,
    acceptingWork: true,
  });
}

function settle(outcome: "done" | "cancelled"): void {
  if (!queue || queue.settled) return;
  queue.settled = true;
  clearInterval(queue.timer);
  const resolve = queue.resolve;
  queue = null;
  resolve(outcome);
}

function releaseExpired(): void {
  if (!queue) return;
  const now = Date.now();
  for (const [cardId, lease] of queue.leased) {
    if (lease.expiresAt > now) continue;
    queue.leased.delete(cardId);
    queue.pending.push(lease.item);
  }
}

function take(cardId: string): QueuedCard | null {
  if (!queue) return null;
  const lease = queue.leased.get(cardId);
  if (lease) {
    queue.leased.delete(cardId);
    return lease.item;
  }
  const index = queue.pending.findIndex((item) => item.card.id === cardId);
  if (index === -1) return null;
  const [item] = queue.pending.splice(index, 1);
  return item;
}

function failItem(item: QueuedCard, message: string): void {
  if (!queue) return;
  item.attempts += 1;
  if (item.attempts >= BROWSER_SYNC_MAX_ATTEMPTS) {
    queue.host.incrementCounters({ errors: 1 });
    queue.host.addLog(`Error: ${item.card.name}: ${message}`);
    return;
  }
  queue.pending.push(item);
}

function isEmbedding(value: number[]): boolean {
  if (value.length !== CARD_EMBEDDING_DIMENSIONS) return false;
  for (const n of value) {
    if (!Number.isFinite(n)) return false;
  }
  return true;
}

export function claimBrowserWork(limit: number): BrowserSyncWorkCard[] {
  if (!queue || queue.settled) return [];
  releaseExpired();
  if (queue.host.isCancelled()) {
    if (queue.submitsInFlight === 0) settle("cancelled");
    return [];
  }
  const count = Math.max(0, Math.min(limit, SYNC_VECTORIZE_CONCURRENCY_MAX));
  const cards: BrowserSyncWorkCard[] = [];
  while (cards.length < count && queue.pending.length > 0) {
    const item = queue.pending.shift();
    if (!item || !item.card.imageUrl) continue;
    queue.leased.set(item.card.id, {
      item,
      expiresAt: Date.now() + BROWSER_SYNC_LEASE_MS,
    });
    cards.push({
      cardId: item.card.id,
      name: item.card.name,
      imageUrl: item.card.imageUrl,
      backImageUrl: item.card.backImageUrl ?? undefined,
    });
  }
  if (cards.length > 0 && !queue.announced) {
    queue.announced = true;
    queue.host.addLog("A browser is vectorizing card images.");
  }
  if (cards[0]) report(cards[0].name);
  return cards;
}

export async function submitBrowserWork(
  results: BrowserSyncWorkResult[],
  failures: BrowserSyncWorkFailure[],
): Promise<"idle" | "busy" | "cancelled"> {
  if (!queue || queue.settled) return "idle";
  queue.submitsInFlight += 1;
  try {
    const accepted: AcceptedBrowserWork[] = [];
    for (const result of results.slice(0, SYNC_VECTORIZE_CONCURRENCY_MAX)) {
      const item = take(result.cardId);
      if (!item) continue;
      if (!isEmbedding(result.embedding)) {
        failItem(item, "Embedding was not a 128-number vector.");
        continue;
      }
      if ((item.card.backImageUrl || result.backEmbedding !== undefined) && (!result.backEmbedding || !isEmbedding(result.backEmbedding))) {
        failItem(item, "The back image needs a 128-number vector.");
        continue;
      }
      accepted.push({ item, embedding: result.embedding, backEmbedding: result.backEmbedding });
    }
    for (const failure of failures.slice(0, SYNC_VECTORIZE_CONCURRENCY_MAX)) {
      const item = take(failure.cardId);
      if (!item) continue;
      const message = failure.message.trim().slice(0, 200) || "Image failed.";
      failItem(item, message);
    }

    if (accepted.length > 0 && queue) {
      const source = queue.host.source;
      const lang = queue.host.lang;
      const ready: {
        item: QueuedCard;
        row: typeof cardImageVectors.$inferInsert;
      }[] = [];
      for (const { item, embedding, backEmbedding } of accepted) {
        let data: unknown;
        try {
          data = JSON.parse(item.card.data);
        } catch {
          failItem(item, "Stored card text could not be read.");
          continue;
        }
        ready.push({
          item,
          row: {
            cardId: item.card.id,
            gameKey: source.gameKey,
            lang,
            name: item.card.name,
            setCode: item.card.setCode,
            collectorNumber: storedCollectorNumber(
              source.gameKey,
              lang,
              item.card.id,
              data,
            ),
            embedding,
            backEmbedding,
            data,
          },
        });
      }
      if (ready.length > 0) {
        try {
          await db
            .insert(cardImageVectors)
            .values(ready.map((entry) => entry.row))
            .onConflictDoUpdate({
              target: [
                cardImageVectors.gameKey,
                cardImageVectors.lang,
                cardImageVectors.cardId,
              ],
              set: {
                backEmbedding: sql`coalesce(${cardImageVectors.backEmbedding}, excluded.back_embedding)`,
                updatedAt: sql`now()`,
              },
            });
          if (queue) {
            queue.host.incrementCounters({ processed: ready.length });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          for (const { item } of ready) failItem(item, message);
          queue?.host.addLog(
            `Error saving ${ready.length} cards from a browser: ${message}`,
          );
        }
      }
    }

    if (!queue) return "idle";
    report(accepted[accepted.length - 1]?.item.card.name);
    releaseExpired();
    const lastSubmit = queue.submitsInFlight === 1;
    if (queue.host.isCancelled() && lastSubmit) return "cancelled";
    if (outstanding() === 0 && lastSubmit) return "idle";
    return "busy";
  } finally {
    if (queue) queue.submitsInFlight -= 1;
  }
}

export function cancelBrowserQueue(): void {
  if (!queue || queue.settled) return;
  if (queue.submitsInFlight === 0) settle("cancelled");
}

export function finishBrowserQueue(outcome: "done" | "cancelled"): void {
  settle(outcome);
}

export async function serveBrowserQueue(
  host: BrowserQueueHost,
): Promise<"done" | "cancelled"> {
  host.incrementCounters({ skipped: host.skipped });
  if (host.cards.length === 0) {
    host.addLog("Every card from this source already has an image vector.");
    host.patchState({ acceptingWork: false, queued: 0 });
    host.emitEvent("status", host.getState());
    return host.isCancelled() ? "cancelled" : "done";
  }

  host.addLog(
    "Leaving stored card text unchanged. Only cards missing an image vector will be processed.",
  );
  host.addLog(
    `Waiting for a browser to vectorize ${host.cards.length} cards missing image vectors. Keep the admin page open.`,
  );
  host.patchState({ acceptingWork: true, queued: host.cards.length });
  host.emitEvent("status", host.getState());

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      releaseExpired();
      if (!queue || queue.settled) return;
      if (queue.host.isCancelled() && queue.submitsInFlight === 0) {
        settle("cancelled");
        return;
      }
      report();
    }, 5_000);
    queue = {
      host,
      pending: host.cards.map((card) => ({ card, attempts: 0 })),
      leased: new Map(),
      timer,
      announced: false,
      settled: false,
      submitsInFlight: 0,
      resolve,
    };
  });
}
