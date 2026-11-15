import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialTradeOfferPickScanIds,
  isTradeOfferBeingPicked,
  splitTradeOfferPickScanIds,
  tradeOfferAcceptRequestSchema,
  tradeOfferPickListSections,
  tradeOfferPickProgress,
  tradeOfferPickedRequestSchema,
  type TradeOfferWantedCard,
  type TradeOfferWantedPlacement,
} from "@magic-vault/shared";

const scanA = "11111111-1111-4111-8111-111111111111";
const scanB = "22222222-2222-4222-8222-222222222222";
const scanC = "33333333-3333-4333-8333-333333333333";

const wantedCard = (scanId: string, name: string): TradeOfferWantedCard => ({
  scanId,
  gameKey: "mtg",
  name,
  setCode: "lea",
  setName: "Alpha",
  collectorNumber: "1",
  imageUrl: null,
  condition: "NM",
  isFoil: false,
  foilType: null,
});

const storagePlacement = (position: number): TradeOfferWantedPlacement => ({
  collectionName: "Main",
  storageLocationGuid: "box",
  storageLocationName: "Box 1",
  storagePosition: position,
  binNumber: null,
});

test("splits picked scan ids out of the remaining set", () => {
  assert.deepEqual(splitTradeOfferPickScanIds([scanA, scanB, scanC], [scanB]), {
    pickedScanIds: [scanB],
    remainingScanIds: [scanA, scanC],
  });
});

test("ignores picked scan ids that are not remaining", () => {
  assert.deepEqual(splitTradeOfferPickScanIds([scanA], [scanB, scanA, scanA]), {
    pickedScanIds: [scanA],
    remainingScanIds: [],
  });
});

test("finishing picks every remaining scan id", () => {
  assert.deepEqual(splitTradeOfferPickScanIds([scanA, scanB, scanA], "all"), {
    pickedScanIds: [scanA, scanB],
    remainingScanIds: [],
  });
});

test("the initial pick set holds each wanted copy once", () => {
  assert.deepEqual(
    initialTradeOfferPickScanIds([wantedCard(scanA, "A"), wantedCard(scanA, "A"), wantedCard(scanB, "B")]),
    [scanA, scanB],
  );
  assert.equal(initialTradeOfferPickScanIds([]), null);
});

test("only accepted offers with remaining cards are being picked", () => {
  assert.equal(isTradeOfferBeingPicked({ status: "accepted", remainingPickScanIds: [scanA] }), true);
  assert.equal(isTradeOfferBeingPicked({ status: "accepted", remainingPickScanIds: null }), false);
  assert.equal(isTradeOfferBeingPicked({ status: "accepted", remainingPickScanIds: [] }), false);
  assert.equal(isTradeOfferBeingPicked({ status: "accepted" }), false);
  assert.equal(isTradeOfferBeingPicked({ status: "pending", remainingPickScanIds: [scanA] }), false);
});

test("progress counts wanted copies no longer remaining", () => {
  const wanted = [wantedCard(scanA, "A"), wantedCard(scanB, "B"), wantedCard(scanC, "C")];
  assert.deepEqual(tradeOfferPickProgress(wanted, [scanC]), { pickedCount: 2, totalCount: 3 });
});

test("pick list orders storage copies by position and keeps picked copies with a known place", () => {
  const wanted = [wantedCard(scanA, "Zebra"), wantedCard(scanB, "Apple"), wantedCard(scanC, "Moon")];
  const sections = tradeOfferPickListSections(
    wanted,
    [1, 2, 3],
    [storagePlacement(9), storagePlacement(4), null],
    [scanA],
  );
  assert.deepEqual(
    sections.map((section) => [section.kind, section.items.map((item) => [item.scanId, item.isPicked])]),
    [
      ["storage", [[scanB, true], [scanA, false]]],
      ["picked", [[scanC, true]]],
    ],
  );
});

test("accept requests stay valid without the pick list flag", () => {
  assert.equal(tradeOfferAcceptRequestSchema.safeParse({}).success, true);
  assert.equal(
    tradeOfferAcceptRequestSchema.safeParse({ removeWantedCardsWhenPicked: true }).success,
    true,
  );
  assert.equal(
    tradeOfferAcceptRequestSchema.safeParse({ removeWantedCardsWhenPicked: "yes" }).success,
    false,
  );
});

test("picked requests need at least one valid scan id", () => {
  assert.equal(tradeOfferPickedRequestSchema.safeParse({ scanIds: [scanA] }).success, true);
  assert.equal(tradeOfferPickedRequestSchema.safeParse({ scanIds: [] }).success, false);
  assert.equal(tradeOfferPickedRequestSchema.safeParse({ scanIds: ["not-a-uuid"] }).success, false);
  assert.equal(tradeOfferPickedRequestSchema.safeParse({}).success, false);
});
