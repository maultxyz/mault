import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardStatsAggregate } from "@magic-vault/shared";
import type { Transaction } from "../src/db";
import { invalidateOrgCardReadCaches } from "../src/lib/org-read-cache";
import { readCardsSummary } from "../src/routes/collections/cards-read";

const collectionGuid = "7a7bb8df-a019-457e-b647-fab4abfae979";

function stats(count: number): CardStatsAggregate {
  return {
    totalCount: count, uniqueCount: count, totalValue: count, priceableCount: count,
    mostValuable: null, sets: [], rarities: [], colors: [], foilTypes: [],
  };
}

function summaryRunner() {
  let count = 1;
  let aggregateLoads = 0;
  let finishAggregate: (() => void) | undefined;
  let waitsForAggregate = false;
  const select = {
    from() { return this; },
    leftJoin() { return this; },
    where() { return this; },
    async limit() {
      return [{ id: 123, name: "Collection", gameKey: "mtg", gameName: "Magic", lang: "en" }];
    },
  };
  const tx = {
    select: () => select,
    query: { orgSettings: { findFirst: async () => null } },
    execute: async () => {
      aggregateLoads++;
      const loadedStats = stats(count);
      if (waitsForAggregate) await new Promise<void>((resolve) => { finishAggregate = resolve; });
      return { rows: [{ all_stats: loadedStats, filtered_stats: loadedStats }] };
    },
  } as unknown as Transaction;
  return {
    run: <T>(load: (transaction: Transaction) => Promise<T>) => load(tx),
    setCount: (next: number) => { count = next; },
    loads: () => aggregateLoads,
    hold: () => { waitsForAggregate = true; },
    release: () => finishAggregate?.(),
  };
}

test("filtered summary returns fresh data immediately after each card invalidation", async (context) => {
  context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1_000_000 });
  const source = summaryRunner();
  const orgId = "summary-immediate-invalidation";
  const read = () => readCardsSummary(source.run, collectionGuid, orgId, { unreviewed: "1" });
  assert.equal((await read())?.filtered.totalCount, 1);
  for (const count of [2, 3, 4]) {
    source.setCount(count);
    invalidateOrgCardReadCaches(orgId);
    const pending = read();
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(source.loads(), count);
    assert.equal((await pending)?.filtered.totalCount, count);
  }
});

test("concurrent filtered summary reads share the current generation load", async () => {
  const source = summaryRunner();
  const orgId = "summary-concurrent-generation";
  const read = () => readCardsSummary(source.run, collectionGuid, orgId, { unreviewed: "1" });
  await read();
  source.setCount(2);
  source.hold();
  invalidateOrgCardReadCaches(orgId);
  const first = read();
  const second = read();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(source.loads(), 2);
  source.release();
  const [left, right] = await Promise.all([first, second]);
  assert.equal(left?.filtered.totalCount, 2);
  assert.deepEqual(left, right);
  assert.deepEqual(await read(), left);
  assert.equal(source.loads(), 2);
});
