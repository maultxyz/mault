import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createScanGiftWrapStore,
  DEFAULT_ORG_PRICING,
  SCAN_GIFT_REVEAL_WRAPPED_MAX,
  SCAN_GIFT_REVEAL_WRAPPED_MAX_AGE_MS,
  scanGiftRevealOf,
  type PlayingCardWithDistance,
  type ScanGiftReveal,
} from "@magic-vault/shared";

const card = {
  id: "card-1",
  name: "Expensive Card",
  setName: "Test Set",
  image: { small: "small.jpg", normal: "normal.jpg" },
  price: 49.99,
  priceFoil: 80,
} as PlayingCardWithDistance;

const usdPricing = { ...DEFAULT_ORG_PRICING, source: "tcgplayer" as const };

test("cards under the threshold get no gift reveal", () => {
  assert.equal(
    scanGiftRevealOf({ scanId: "scan-1", card }, usdPricing, "collection-1"),
    null,
  );
});

test("a foil copy over the threshold gets a gift reveal", () => {
  const reveal = scanGiftRevealOf(
    { scanId: "scan-2", card, isFoil: true },
    usdPricing,
    "collection-1",
  );
  assert.deepEqual(reveal, {
    scanId: "scan-2",
    collectionGuid: "collection-1",
    cardName: "Expensive Card",
    setName: "Test Set",
    image: { small: "small.jpg", normal: "normal.jpg" },
    isFoil: true,
    price: 80,
    currency: "USD",
  });
});

test("cards without a price get no gift reveal", () => {
  assert.equal(
    scanGiftRevealOf(
      { scanId: "scan-3", card: { ...card, price: null, priceFoil: null } },
      usdPricing,
      null,
    ),
    null,
  );
});

function revealFor(scanId: string): ScanGiftReveal {
  return {
    scanId,
    collectionGuid: null,
    cardName: scanId,
    setName: null,
    image: null,
    isFoil: false,
    price: 60,
    currency: "USD",
  };
}

test("the gift wrap store wraps each scan once until it is unwrapped", () => {
  const store = createScanGiftWrapStore();
  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });
  store.wrap(revealFor("a"), 0);
  store.wrap(revealFor("a"), 0);
  store.wrap(revealFor("b"), 0);
  assert.equal(notifications, 2);
  assert.equal(store.wrappedRevealFor(["x", "a"], 10)?.scanId, "a");
  assert.equal(store.latestReveal()?.scanId, "b");
  store.unwrap("a");
  assert.equal(store.wrappedRevealFor(["a"], 10), null);
  store.wrap(revealFor("a"), 20);
  assert.equal(store.wrappedRevealFor(["a"], 30), null);
});

test("wrapped gifts expire and only the newest few stay wrapped", () => {
  const store = createScanGiftWrapStore();
  store.wrap(revealFor("old"), 0);
  assert.equal(store.wrappedRevealFor(["old"], SCAN_GIFT_REVEAL_WRAPPED_MAX_AGE_MS), null);
  for (let index = 0; index < SCAN_GIFT_REVEAL_WRAPPED_MAX + 1; index += 1)
    store.wrap(revealFor(`card-${index}`), 0);
  assert.equal(store.wrappedRevealFor(["card-0"], 1), null);
  assert.equal(
    store.wrappedRevealFor([`card-${SCAN_GIFT_REVEAL_WRAPPED_MAX}`], 1)?.scanId,
    `card-${SCAN_GIFT_REVEAL_WRAPPED_MAX}`,
  );
});
