import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardPriceHistorySeries,
  type CardPriceHistoryPoint,
} from "@magic-vault/shared";

const point = (
  day: string,
  prices: Partial<Omit<CardPriceHistoryPoint, "day">>,
): CardPriceHistoryPoint => ({
  day,
  price: null,
  priceFoil: null,
  priceEur: null,
  priceEurFoil: null,
  priceCardKingdom: null,
  priceCardKingdomFoil: null,
  ...prices,
});

test("fills days between price changes with the last recorded price", () => {
  const series = cardPriceHistorySeries(
    [point("2026-11-21", { price: 2 }), point("2026-11-18", { price: 1 })],
    { source: "tcgplayer", isFoil: false, rangeDays: 30, today: "2026-11-23" },
  );
  assert.deepEqual(series.days, [
    { day: "2026-11-18", value: 1 },
    { day: "2026-11-19", value: 1 },
    { day: "2026-11-20", value: 1 },
    { day: "2026-11-21", value: 2 },
    { day: "2026-11-22", value: 2 },
    { day: "2026-11-23", value: 2 },
  ]);
  assert.equal(series.currentPriceSinceDay, "2026-11-21");
  assert.equal(series.isFoilPrice, false);
});

test("starts at the range start, carrying the price recorded before it", () => {
  const series = cardPriceHistorySeries(
    [point("2026-01-01", { priceEur: 5 }), point("2026-11-23", { priceEur: 6 })],
    { source: "cardmarket", isFoil: false, rangeDays: 3, today: "2026-11-23" },
  );
  assert.deepEqual(series.days, [
    { day: "2026-11-21", value: 5 },
    { day: "2026-11-22", value: 5 },
    { day: "2026-11-23", value: 6 },
  ]);
});

test("dates an unchanged price from its last change before the range", () => {
  const series = cardPriceHistorySeries(
    [point("2026-09-01", { price: 2 }), point("2026-10-01", { price: 3 }), point("2026-10-15", { priceEur: 1, price: 3 })],
    { source: "tcgplayer", isFoil: false, rangeDays: 30, today: "2026-11-23" },
  );
  assert.deepEqual(series.days, [{ day: "2026-11-23", value: 3 }]);
  assert.equal(series.currentPriceSinceDay, "2026-10-01");
});

test("keeps only today when the price never changed in the range", () => {
  const series = cardPriceHistorySeries([point("2026-11-01", { price: 4 })], {
    source: "tcgplayer",
    isFoil: false,
    rangeDays: 30,
    today: "2026-11-23",
  });
  assert.deepEqual(series.days, [{ day: "2026-11-23", value: 4 }]);
  assert.equal(series.currentPriceSinceDay, "2026-11-01");
});

test("uses foil prices for foil copies and falls back when there are none", () => {
  const points = [point("2026-11-22", { price: 1, priceFoil: 4 })];
  const options = { source: "tcgplayer" as const, rangeDays: 30, today: "2026-11-23" };
  const foil = cardPriceHistorySeries(points, { ...options, isFoil: true });
  assert.equal(foil.isFoilPrice, true);
  assert.equal(foil.days[0].value, 4);
  const nonFoilOnly = cardPriceHistorySeries([point("2026-11-22", { price: 1 })], {
    ...options,
    isFoil: true,
  });
  assert.equal(nonFoilOnly.isFoilPrice, false);
  assert.equal(nonFoilOnly.days[0].value, 1);
});

test("skips days after the price went missing", () => {
  const series = cardPriceHistorySeries(
    [point("2026-11-21", { price: 3 }), point("2026-11-22", {})],
    { source: "tcgplayer", isFoil: false, rangeDays: 30, today: "2026-11-23" },
  );
  assert.deepEqual(series.days, [{ day: "2026-11-21", value: 3 }]);
});

test("is empty without any price for the source", () => {
  const series = cardPriceHistorySeries([point("2026-11-21", { price: 3 })], {
    source: "cardkingdom",
    isFoil: false,
    rangeDays: 30,
    today: "2026-11-23",
  });
  assert.deepEqual(series, { days: [], isFoilPrice: false, currentPriceSinceDay: null });
});
