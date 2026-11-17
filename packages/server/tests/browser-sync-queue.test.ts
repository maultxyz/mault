import assert from "node:assert/strict";
import { test } from "node:test";
import type { SyncState } from "@magic-vault/shared";
import { db } from "../src/db";
import type { BrowserQueueHost } from "../src/lib/interfaces/sync-job";
import {
  claimBrowserWork,
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
      data: "{}",
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
