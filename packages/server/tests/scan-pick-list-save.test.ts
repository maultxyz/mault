import assert from "node:assert/strict";
import { test } from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Transaction } from "../src/db";
import { bins, collectionCards } from "../src/db/schema";
import { insertScanWithPickList, isScanSavePickListUpdate } from "../src/lib/scan-pick-list";

const update = { binGuid: "bin", name: "Lightning Bolt", delta: 1 as const };
const scan = { guid: "scan", orgId: "org", collectionId: 1, cardId: "card", card: {}, scannedAt: new Date() };
function database() {
  let state = { saved: false, found: 0 };
  let failPick = false;
  let visible = true;
  const scopes: unknown[][] = [];
  async function transaction() {
    const pending = { ...state };
    const tx = {
      insert(table: unknown) {
        assert.equal(table, collectionCards);
        return { values: () => ({ onConflictDoNothing: () => ({ returning: async () => {
          if (pending.saved) return [];
          pending.saved = true;
          return [{ id: 1 }];
        } }) }) };
      },
      select: () => ({ from(table: unknown) {
        assert.equal(table, bins);
        return { where(predicate: Parameters<PgDialect["sqlToQuery"]>[0]) {
          scopes.push(new PgDialect().sqlToQuery(predicate).params);
          return { for: async (lock: string) => {
            assert.equal(lock, "update");
            return visible ? [{ id: 1, pickList: { mode: "until_found", entries: [{ name: update.name, quantity: 3, found: pending.found }] } }] : [];
          } };
        } };
      } }),
      update: () => ({ set: ({ pickList }: { pickList: { entries: { found: number }[] } }) => ({ where: async () => {
        if (failPick) throw new Error("pick write failed");
        pending.found = pickList.entries[0].found;
      } }) }),
    } as unknown as Transaction;
    await insertScanWithPickList(tx, scan, update);
    state = pending;
  }
  return { transaction, state: () => state, scopes, fail: (value: boolean) => { failPick = value; }, visible: (value: boolean) => { visible = value; } };
}

test("a failed pick write rolls back insertion and a recovered retry commits both exactly once", async () => {
  const db = database();
  db.fail(true);
  await assert.rejects(db.transaction(), /pick write failed/);
  assert.deepEqual(db.state(), { saved: false, found: 0 });
  db.fail(false);
  await db.transaction();
  assert.deepEqual(db.state(), { saved: true, found: 1 });
  await db.transaction();
  assert.deepEqual(db.state(), { saved: true, found: 1 });
  assert.deepEqual(db.scopes, [["bin", "org", false], ["bin", "org", false]]);
});

test("a missing or RLS-hidden pick bin cannot commit the scan", async () => {
  const db = database();
  db.visible(false);
  await assert.rejects(db.transaction(), /bin was not found/);
  assert.deepEqual(db.state(), { saved: false, found: 0 });
});

test("new scan metadata accepts only a positive single pick increment", () => {
  assert.equal(isScanSavePickListUpdate(update), true);
  for (const invalid of [null, {}, { ...update, delta: -1 }, { ...update, delta: 2 }, { ...update, name: "" }, { ...update, binGuid: null }])
    assert.equal(isScanSavePickListUpdate(invalid), false);
});
