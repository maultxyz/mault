import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectionCardOfTheDayScanIds,
  pickCardsOfTheDay,
} from "../src/lib/widget-summary";
import type { WidgetCollectionCardPick } from "../src/lib/interfaces/widget-summary";

function pick(overrides: Partial<WidgetCollectionCardPick> & Pick<WidgetCollectionCardPick, "scanId" | "collectionGuid">): WidgetCollectionCardPick {
  return {
    isTopCard: false,
    isBiggestPriceRise: false,
    isBiggestPriceDrop: false,
    isInDailyShuffle: false,
    dayRank: 99,
    ...overrides,
  };
}

const isSameScan = (first: string, second: string) => first === second;

test("cards of the day prefer the biggest rise and drop over the daily shuffle", () => {
  assert.deepEqual(pickCardsOfTheDay("rise", "drop", ["shuffle-1", "shuffle-2"], isSameScan), ["rise", "drop"]);
});

test("cards of the day fill missing rise or drop from the daily shuffle without repeats", () => {
  assert.deepEqual(pickCardsOfTheDay("rise", undefined, ["rise", "shuffle-2"], isSameScan), ["rise", "shuffle-2"]);
  assert.deepEqual(pickCardsOfTheDay(undefined, undefined, ["shuffle-1", "shuffle-2", "shuffle-3"], isSameScan), [
    "shuffle-1",
    "shuffle-2",
  ]);
});

test("collection cards of the day are picked per collection in the listed order", () => {
  const picks = [
    pick({ scanId: "b-shuffle-2", collectionGuid: "b", isInDailyShuffle: true, dayRank: 2 }),
    pick({ scanId: "a-drop", collectionGuid: "a", isBiggestPriceDrop: true }),
    pick({ scanId: "b-shuffle-1", collectionGuid: "b", isInDailyShuffle: true, dayRank: 1 }),
    pick({ scanId: "a-rise", collectionGuid: "a", isBiggestPriceRise: true, isInDailyShuffle: true, dayRank: 1 }),
    pick({ scanId: "c-top", collectionGuid: "c", isTopCard: true }),
  ];
  assert.deepEqual(collectionCardOfTheDayScanIds(picks, ["b", "a", "c"]), [
    "b-shuffle-1",
    "b-shuffle-2",
    "a-rise",
    "a-drop",
  ]);
});

test("collections outside the listed set contribute no cards of the day", () => {
  const picks = [pick({ scanId: "z-rise", collectionGuid: "z", isBiggestPriceRise: true })];
  assert.deepEqual(collectionCardOfTheDayScanIds(picks, ["a"]), []);
});
