import assert from "node:assert/strict";
import { test } from "node:test";
import { planSyncPrune } from "../src/lib/sync-job/prune";

const storedCardIds = Array.from({ length: 100 }, (_, index) => `card-${index}`);

function fetchedWithout(...missingCardIds: string[]): Set<string> {
  return new Set(storedCardIds.filter((cardId) => !missingCardIds.includes(cardId)));
}

test("cards the source no longer lists are pruned", () => {
  const plan = planSyncPrune({
    storedCardIds,
    fetchedCardIds: fetchedWithout("card-3", "card-7"),
    incompleteFetchReasons: [],
    maxShareOfStoredCards: 0.1,
  });
  assert.deepEqual(plan, { kind: "prune", cardIdsToDelete: ["card-3", "card-7"] });
});

test("nothing is pruned when every stored card is still listed", () => {
  const plan = planSyncPrune({
    storedCardIds,
    fetchedCardIds: new Set([...storedCardIds, "new-card"]),
    incompleteFetchReasons: [],
    maxShareOfStoredCards: 0.1,
  });
  assert.deepEqual(plan, { kind: "prune", cardIdsToDelete: [] });
});

test("an incomplete fetch never prunes", () => {
  const plan = planSyncPrune({
    storedCardIds,
    fetchedCardIds: fetchedWithout("card-3"),
    incompleteFetchReasons: ["TCGTracking set Vendetta skipped"],
    maxShareOfStoredCards: 0.1,
  });
  assert.equal(plan.kind, "skip");
  assert.equal(plan.kind === "skip" && plan.staleCardCount, 1);
});

test("an empty source never prunes", () => {
  const plan = planSyncPrune({
    storedCardIds: ["card-0"],
    fetchedCardIds: new Set(),
    incompleteFetchReasons: [],
    maxShareOfStoredCards: 1,
  });
  assert.equal(plan.kind, "skip");
});

test("pruning more than the allowed share of stored cards is refused", () => {
  const missingCardIds = storedCardIds.slice(0, 11);
  const plan = planSyncPrune({
    storedCardIds,
    fetchedCardIds: fetchedWithout(...missingCardIds),
    incompleteFetchReasons: [],
    maxShareOfStoredCards: 0.1,
  });
  assert.equal(plan.kind, "skip");
  assert.equal(plan.kind === "skip" && plan.staleCardCount, 11);
});

test("pruning exactly the allowed share is accepted", () => {
  const missingCardIds = storedCardIds.slice(0, 10);
  const plan = planSyncPrune({
    storedCardIds,
    fetchedCardIds: fetchedWithout(...missingCardIds),
    incompleteFetchReasons: [],
    maxShareOfStoredCards: 0.1,
  });
  assert.deepEqual(plan, { kind: "prune", cardIdsToDelete: missingCardIds });
});
