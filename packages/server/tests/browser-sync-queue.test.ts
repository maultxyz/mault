import assert from "node:assert/strict";
import { test } from "node:test";
import { PRINTING_MARK_VERSION, printingRegionsOf, type BrowserSyncPrintingMarkResult, type SyncState } from "@magic-vault/shared";
import { db } from "../src/db";
import type { BrowserQueueHost } from "../src/lib/interfaces/sync-job";
import {
  claimBrowserWork,
  cancelBrowserQueue,
  finishBrowserQueue,
  serveBrowserQueue,
  submitBrowserWork,
} from "../src/lib/sync-job/browser-queue";

function host(count = 1): BrowserQueueHost {
  const state = { processed: 0, skipped: 0, errors: 0 } as SyncState;
  return {
    source: { gameKey: "mtg" } as BrowserQueueHost["source"],
    lang: "en",
    cards: Array.from({ length: count }, (_, i) => ({
      id: `card-${i}`, name: `Card ${i}`, setCode: "test",
      imageUrl: `https://example.test/${i}/front`,
      backImageUrl: `https://example.test/${i}/back`,
      data: JSON.stringify({ set: "plst", frame: "2015", prices: {} }),
    })),
    skipped: 0,
    addLog: () => {},
    patchState: (patch) => Object.assign(state, patch),
    incrementCounters: (delta) => {
      state.processed += delta.processed ?? 0;
      state.skipped += delta.skipped ?? 0;
      state.errors += delta.errors ?? 0;
    },
    emitEvent: () => {},
    getState: () => state,
    isCancelled: () => false,
  };
}

const embedding = Array(128).fill(0.1);
const backEmbedding = Array(128).fill(0.2);

test("browser sync leases 32 distinct cards with both image URLs", async (t) => {
  t.after(() => finishBrowserQueue("cancelled"));
  const running = serveBrowserQueue(host(40));
  const cards = claimBrowserWork(32);
  assert.equal(cards.length, 32);
  assert.equal(new Set(cards.map((card) => card.cardId)).size, 32);
  assert.equal(cards[0].backImageUrl, "https://example.test/0/back");
  assert.equal(claimBrowserWork(32).length, 8);
  assert.equal(claimBrowserWork(1).length, 0);
  finishBrowserQueue("cancelled");
  await running;
});

function markResult(cardId: string): BrowserSyncPrintingMarkResult {
  return {
    kind: "printingMarks", cardId, version: PRINTING_MARK_VERSION,
    grids: printingRegionsOf("mtg").map((region) => ({
      key: region.key,
      values: Array(region.gridWidth * region.gridHeight).fill(80),
    })),
  };
}

test("printing mark work uses catalog images, buffers writes and counts only persisted results", async (t) => {
  t.after(() => finishBrowserQueue("cancelled"));
  const queueHost = host(2);
  queueHost.kind = "printingMarks";
  queueHost.cards[0].printingMarkImageUrl = "https://example.test/large";
  queueHost.getState().processed = 12;
  const running = serveBrowserQueue(queueHost);
  let writes = 0;
  let releaseSave!: () => void;
  const saving = new Promise<void>((resolve) => { releaseSave = resolve; });
  t.mock.method(db, "transaction", async (write: (tx: unknown) => Promise<void>) => {
    writes++;
    await write({ execute: async () => {} });
    await saving;
  });
  const [first, last] = claimBrowserWork(2);
  assert.equal(first.kind, "printingMarks");
  assert.equal(first.imageUrl, "https://example.test/large");
  assert.equal(first.backImageUrl, undefined);
  assert.equal(first.printingMarkVersion, PRINTING_MARK_VERSION);
  assert.equal(await submitBrowserWork([markResult(first.cardId)], []), "busy");
  assert.equal(writes, 0);
  assert.equal(queueHost.getState().printingMarksDone, 0);
  const submission = submitBrowserWork([markResult(last.cardId)], []);
  assert.equal(queueHost.getState().printingMarksDone, 0);
  releaseSave();
  assert.equal(await submission, "idle");
  assert.equal(writes, 1);
  assert.equal(queueHost.getState().printingMarksDone, 2);
  assert.equal(queueHost.getState().processed, 12);
  assert.equal(queueHost.getState().errors, 0);
  // A retried HTTP submission must not count these references twice.
  await submitBrowserWork([markResult(last.cardId)], []);
  assert.equal(writes, 1);
  finishBrowserQueue("done");
  await running;
});

test("printing mark writes retry without increasing saved counts", async (t) => {
  t.after(() => finishBrowserQueue("cancelled"));
  const queueHost = host();
  queueHost.kind = "printingMarks";
  const running = serveBrowserQueue(queueHost);
  let fail = true;
  t.mock.method(db, "transaction", async (write: (tx: unknown) => Promise<void>) => {
    if (fail) throw new Error("database unavailable");
    await write({ execute: async () => {} });
  });
  const [card] = claimBrowserWork(1);
  assert.equal(await submitBrowserWork([markResult(card.cardId)], []), "busy");
  assert.equal(queueHost.getState().printingMarksDone, 0);
  assert.equal(claimBrowserWork(1)[0].cardId, card.cardId);
  fail = false;
  assert.equal(await submitBrowserWork([markResult(card.cardId)], []), "idle");
  assert.equal(queueHost.getState().printingMarksDone, 1);
  finishBrowserQueue("done");
  await running;
});

test("late vector responses cannot consume printing mark work and invalid grids retry", async (t) => {
  t.after(() => finishBrowserQueue("cancelled"));
  const queueHost = host();
  queueHost.kind = "printingMarks";
  const running = serveBrowserQueue(queueHost);
  const [card] = claimBrowserWork(1);
  await submitBrowserWork([{ cardId: card.cardId, embedding, backEmbedding }], []);
  assert.equal(claimBrowserWork(1).length, 0);
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = markResult(card.cardId);
    result.grids[0].values[0] = NaN;
    await submitBrowserWork([result], []);
    assert.equal(claimBrowserWork(1).length, attempt < 2 ? 1 : 0);
  }
  assert.equal(queueHost.getState().printingMarksFailed, 1);
  assert.equal(queueHost.getState().errors, 0);
  assert.equal(queueHost.getState().printingMarksDone, 0);
  finishBrowserQueue("done");
  await running;
});

test("printing marks flush at 250 cards while more work is queued, and cancel keeps saved progress", async (t) => {
  t.after(() => finishBrowserQueue("cancelled"));
  const queueHost = host(251);
  queueHost.kind = "printingMarks";
  const running = serveBrowserQueue(queueHost);
  let writes = 0;
  t.mock.method(db, "transaction", async (write: (tx: unknown) => Promise<void>) => {
    writes++;
    await write({ execute: async () => {} });
  });
  for (let completed = 0; completed < 250;) {
    const cards = claimBrowserWork(Math.min(32, 250 - completed));
    completed += cards.length;
    await submitBrowserWork(cards.map((card) => markResult(card.cardId)), []);
  }
  assert.equal(writes, 1);
  assert.equal(queueHost.getState().printingMarksDone, 250);
  queueHost.isCancelled = () => true;
  cancelBrowserQueue();
  assert.equal(await running, "cancelled");
  assert.equal(queueHost.getState().printingMarksDone, 250);
  assert.equal(claimBrowserWork(1).length, 0);
});

test("double-faced cards require both vectors and count only after persistence", async (t) => {
  t.after(() => finishBrowserQueue("cancelled"));
  const queueHost = host();
  const running = serveBrowserQueue(queueHost);
  let saved: Record<string, unknown>[] = [];
  let updates: Record<string, unknown> = {};
  let releaseSave!: () => void;
  const saving = new Promise<void>((resolve) => { releaseSave = resolve; });
  t.mock.method(db, "insert", () => ({
    values: (rows: Record<string, unknown>[]) => ({
      onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => {
        saved = rows;
        updates = set;
        return saving;
      },
    }),
  }));
  const [card] = claimBrowserWork(1);
  await submitBrowserWork([{ cardId: card.cardId, embedding }], []);
  assert.equal(saved.length, 0);
  assert.equal(queueHost.getState().processed, 0);
  assert.equal(claimBrowserWork(1)[0].cardId, card.cardId);
  const submission = submitBrowserWork([{ cardId: card.cardId, embedding, backEmbedding }], []);
  assert.equal(queueHost.getState().processed, 0);
  assert.deepEqual(saved[0].backEmbedding, backEmbedding);
  assert.deepEqual(Object.keys(updates).sort(), ["backEmbedding", "updatedAt"]);
  releaseSave();
  assert.equal(await submission, "idle");
  assert.equal(queueHost.getState().processed, 1);
  finishBrowserQueue("done");
  assert.equal(await running, "done");
});

test("failed database writes remain queued and are not reported as saved", async (t) => {
  t.after(() => finishBrowserQueue("cancelled"));
  const queueHost = host();
  const running = serveBrowserQueue(queueHost);
  let fail = true;
  t.mock.method(db, "insert", () => ({
    values: () => ({
      onConflictDoUpdate: async () => {
        if (fail) throw new Error("database unavailable");
      },
    }),
  }));
  const [card] = claimBrowserWork(1);
  const result = { cardId: card.cardId, embedding, backEmbedding };
  assert.equal(await submitBrowserWork([result], []), "busy");
  assert.equal(queueHost.getState().processed, 0);
  assert.equal(claimBrowserWork(1)[0].cardId, card.cardId);
  fail = false;
  assert.equal(await submitBrowserWork([result], []), "idle");
  assert.equal(queueHost.getState().processed, 1);
  finishBrowserQueue("done");
  await running;
});
