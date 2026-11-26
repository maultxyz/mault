import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardStatsAggregate } from "@magic-vault/shared";
import type { Transaction } from "../src/db";
import { invalidateOrgCardReadCaches, invalidateOrgReadCaches } from "../src/lib/org-read-cache";
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

test("card writes serve cached summaries and refresh once in the background after fifteen seconds", async (context) => {
  context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1_000_000 });
  const source = summaryRunner();
  const orgId = "summary-background-refresh";
  const read = () => readCardsSummary(source.run, collectionGuid, orgId, { unreviewed: "1" });
  assert.equal((await read())?.filtered.totalCount, 1);
  source.setCount(2);
  invalidateOrgCardReadCaches(orgId);
  assert.equal((await read())?.filtered.totalCount, 1);
  assert.equal(source.loads(), 1);
  context.mock.timers.tick(15_000);
  source.hold();
  assert.equal((await read())?.filtered.totalCount, 1);
  assert.equal((await read())?.filtered.totalCount, 1);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(source.loads(), 2);
  source.release();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal((await read())?.filtered.totalCount, 2);
});

test("broader organization invalidation does not serve the previous summary", async () => {
  const source = summaryRunner();
  const orgId = "summary-broad-invalidation";
  const read = () => readCardsSummary(source.run, collectionGuid, orgId, { unreviewed: "1" });
  await read();
  source.setCount(2);
  invalidateOrgReadCaches(orgId);
  assert.equal((await read())?.filtered.totalCount, 2);
  assert.equal(source.loads(), 2);
});

test("cold concurrent summary reads share one database load", async () => {
  const source = summaryRunner();
  source.hold();
  const read = () => readCardsSummary(source.run, collectionGuid, "summary-cold-concurrent", { unreviewed: "1" });
  const first = read();
  const second = read();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(source.loads(), 1);
  source.release();
  assert.deepEqual(await first, await second);
});
