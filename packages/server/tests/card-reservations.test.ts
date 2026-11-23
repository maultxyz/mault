import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CARD_RESERVATION_CARDS_PER_REQUEST_MAX,
  CARD_RESERVATION_HOLD_LAPSE_REFETCH_DELAY_MS,
  msUntilCardReservationHoldsLapse,
  cardReservationFormSchema,
  cardReservationGroupStage,
  cardReservationStage,
  cardReservationRequestSchema,
  groupCardReservationsByRequest,
  cardReservationHoldExpiry,
  cardReservationQueuePositions,
  settleCardReservationQueue,
  shopCatalogFormSchema,
  shopCatalogRequestSchema,
  toCardReservationHoldDays,
  type CardReservation,
  type CardReservationQueueEntry,
} from "@magic-vault/shared";
import {
  cardReservationSettlementHasChanges,
  planCardReservationSettlement,
} from "../src/lib/card-reservation-settlement";
import type { ActiveCardReservationRow } from "../src/lib/interfaces/card-reservations";
import { containsLikePattern } from "../src/lib/business-list-search";

const NOW = new Date("2026-11-21T12:00:00.000Z");
const EARLIER = new Date("2026-11-20T12:00:00.000Z");
const LATER = new Date("2026-11-22T12:00:00.000Z");

function entry(
  id: number,
  status: CardReservationQueueEntry["status"],
  holdExpiresAt: Date | null = null,
  holdDays = 3,
): CardReservationQueueEntry {
  return { id, status, holdDays, holdExpiresAt };
}

function row(
  id: number,
  collectionCardId: number,
  status: ActiveCardReservationRow["status"],
  holdExpiresAt: Date | null = null,
  cardExists = true,
): ActiveCardReservationRow {
  return { id, collectionCardId, guestKeyHash: `guest-${id}`, status, holdDays: 2, holdExpiresAt, cardExists };
}

test("a holder whose hold is still running keeps the card", () => {
  assert.deepEqual(
    settleCardReservationQueue([entry(1, "ready", LATER), entry(2, "waiting")], NOW),
    { expiredId: null, promoted: null },
  );
});

test("a lapsed hold expires and the next person in line gets a fresh hold from now", () => {
  const settlement = settleCardReservationQueue(
    [entry(1, "ready", EARLIER), entry(2, "waiting", null, 7), entry(3, "waiting")],
    NOW,
  );
  assert.equal(settlement.expiredId, 1);
  assert.deepEqual(settlement.promoted, {
    id: 2,
    holdStartedAt: NOW,
    holdExpiresAt: cardReservationHoldExpiry(NOW, 7),
  });
});

test("a hold that lapses exactly now has expired", () => {
  assert.equal(settleCardReservationQueue([entry(1, "ready", NOW)], NOW).expiredId, 1);
});

test("a lapsed hold with nobody waiting just expires", () => {
  assert.deepEqual(settleCardReservationQueue([entry(1, "ready", EARLIER)], NOW), {
    expiredId: 1,
    promoted: null,
  });
});

test("a queue left without a holder promotes the person who joined first", () => {
  const settlement = settleCardReservationQueue([entry(5, "waiting"), entry(6, "waiting")], NOW);
  assert.equal(settlement.expiredId, null);
  assert.equal(settlement.promoted?.id, 5);
});

test("queue positions count the holder as first and the line behind in join order", () => {
  const positions = cardReservationQueuePositions([
    entry(4, "waiting"),
    entry(2, "ready", LATER),
    entry(9, "waiting"),
  ]);
  assert.deepEqual([...positions], [[2, 1], [4, 2], [9, 3]]);
  assert.deepEqual([...cardReservationQueuePositions([entry(4, "waiting")])], [[4, 1]]);
});

test("the settlement plan handles each card's queue on its own", () => {
  const plan = planCardReservationSettlement(
    [
      row(1, 100, "ready", EARLIER),
      row(2, 100, "waiting"),
      row(3, 200, "ready", LATER),
      row(4, 200, "waiting"),
      row(5, 300, "ready", LATER, false),
      row(6, 300, "waiting", null, false),
    ],
    NOW,
  );
  assert.deepEqual(plan.expiredIds, [1]);
  assert.deepEqual(plan.promotions.map((promotion) => promotion.id), [2]);
  assert.deepEqual(plan.unavailableIds, [5, 6]);
  assert.equal(cardReservationSettlementHasChanges(plan), true);
});

test("a settled queue plans no changes", () => {
  const plan = planCardReservationSettlement(
    [row(1, 100, "ready", LATER), row(2, 100, "waiting")],
    NOW,
  );
  assert.equal(cardReservationSettlementHasChanges(plan), false);
});

test("hold days fall back to the default for values outside the choices", () => {
  assert.equal(toCardReservationHoldDays(7), 7);
  assert.equal(toCardReservationHoldDays(5), 3);
  assert.equal(toCardReservationHoldDays(undefined), 3);
});

test("a reservation needs a name and a way to reach the guest", () => {
  assert.equal(
    cardReservationFormSchema.safeParse({ guestName: "Sam", guestContact: "", guestNote: "" }).success,
    false,
  );
  assert.equal(
    cardReservationFormSchema.safeParse({ guestName: " ", guestContact: "sam@example.com", guestNote: "" })
      .success,
    false,
  );
  assert.equal(
    cardReservationFormSchema.safeParse({ guestName: "Sam", guestContact: "sam@example.com", guestNote: "" })
      .success,
    true,
  );
});

test("catalog saves from app versions without reservation settings still parse", () => {
  const storeAppRequest = {
    name: "Showcase",
    showsPrices: true,
    isPublic: false,
    collectionGuids: ["collection-guid"],
    storageLocationGuids: [],
  };
  assert.equal(shopCatalogRequestSchema.safeParse(storeAppRequest).success, true);
  assert.equal(shopCatalogFormSchema.safeParse(storeAppRequest).success, false);
  assert.equal(
    shopCatalogRequestSchema.safeParse({ ...storeAppRequest, reservationHoldDays: 5 }).success,
    false,
  );
  assert.equal(
    shopCatalogFormSchema.safeParse({
      ...storeAppRequest,
      allowsReservations: true,
      reservationHoldDays: 7,
    }).success,
    true,
  );
});

test("a reservation request takes one to the per-request maximum of cards", () => {
  const guest = { guestName: "Sam", guestContact: "sam@example.com", guestNote: "" };
  const scanId = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const scanIds = (count: number) => Array.from({ length: count }, (_, index) => scanId(index));
  assert.equal(cardReservationRequestSchema.safeParse({ ...guest, scanIds: [] }).success, false);
  assert.equal(cardReservationRequestSchema.safeParse({ ...guest, scanIds: scanIds(3) }).success, true);
  assert.equal(
    cardReservationRequestSchema.safeParse({
      ...guest,
      scanIds: scanIds(CARD_RESERVATION_CARDS_PER_REQUEST_MAX + 1),
    }).success,
    false,
  );
  assert.equal(cardReservationRequestSchema.safeParse({ ...guest, scanIds: ["not-a-uuid"] }).success, false);
});

function ownerReservation(
  guid: string,
  requestGuid: string,
  status: CardReservation["status"],
  price: number | null,
): CardReservation {
  return {
    guid,
    requestGuid,
    scanId: null,
    card: {
      gameKey: "mtg",
      name: guid,
      setCode: "lea",
      setName: "Alpha",
      collectorNumber: "1",
      imageUrl: null,
      condition: "NM",
      isFoil: false,
      foilType: null,
    },
    status,
    queuePosition: null,
    queueLength: 0,
    holdExpiresAt: null,
    isReadyForPickup: false,
    createdAt: NOW.toISOString(),
    closedAt: null,
    guestName: `guest of ${requestGuid}`,
    guestContact: "contact",
    guestNote: null,
    catalogName: null,
    price,
    priceSource: "tcgplayer",
    placement: null,
    pickOrderGuid: null,
    pickOrderName: null,
  };
}

test("owner reservations group by request and total only the cards ready for pickup", () => {
  const groups = groupCardReservationsByRequest([
    ownerReservation("a", "request-1", "ready", 1.25),
    ownerReservation("b", "request-2", "waiting", 9),
    ownerReservation("c", "request-1", "waiting", 4),
    ownerReservation("d", "request-1", "ready", 2.1),
    ownerReservation("e", "request-2", "ready", null),
  ]);
  assert.deepEqual(groups.map((group) => group.requestGuid), ["request-1", "request-2"]);
  assert.deepEqual(groups[0].reservations.map((reservation) => reservation.guid), ["a", "c", "d"]);
  assert.equal(groups[0].heldCount, 2);
  assert.equal(groups[0].waitingCount, 1);
  assert.equal(groups[0].heldPriceTotal, 3.35);
  assert.equal(groups[0].hasMissingHeldPrices, false);
  assert.equal(groups[1].heldPriceTotal, 0);
  assert.equal(groups[1].hasMissingHeldPrices, true);
});

test("a held card moves from to pull, to being picked, to ready for pickup", () => {
  const held = ownerReservation("a", "request", "ready", 1);
  assert.equal(cardReservationStage(held), "toPull");
  assert.equal(cardReservationStage({ ...held, pickOrderGuid: "pick" }), "beingPicked");
  assert.equal(
    cardReservationStage({ ...held, pickOrderGuid: "pick", isReadyForPickup: true }),
    "readyForPickup",
  );
  assert.equal(cardReservationStage(ownerReservation("b", "request", "waiting", 1)), "waiting");
  assert.equal(cardReservationStage(ownerReservation("c", "request", "expired", 1)), "expired");
});

test("a request takes the stage that needs attention first and lists its open picks once", () => {
  const ready = { ...ownerReservation("a", "ready", "ready", 1), isReadyForPickup: true };
  const picking = { ...ownerReservation("b", "picking", "ready", 1), pickOrderGuid: "pick-1", pickOrderName: "Pick 1" };
  const [readyGroup, toPullGroup, pickingGroup, waitingGroup, collectedGroup, mixedGroup] =
    groupCardReservationsByRequest([
      ready,
      ownerReservation("c", "ready", "ready", 1),
      ownerReservation("d", "to-pull", "ready", 1),
      ownerReservation("e", "to-pull", "waiting", 1),
      picking,
      { ...picking, guid: "f" },
      ownerReservation("g", "waiting", "waiting", 1),
      ownerReservation("h", "collected", "collected", 1),
      ownerReservation("i", "mixed", "collected", 1),
      ownerReservation("j", "mixed", "expired", 1),
    ]);
  assert.equal(cardReservationGroupStage(readyGroup), "readyForPickup");
  assert.equal(readyGroup.readyForPickupCount, 1);
  assert.equal(readyGroup.toPullCount, 1);
  assert.equal(cardReservationGroupStage(toPullGroup), "toPull");
  assert.equal(cardReservationGroupStage(pickingGroup), "beingPicked");
  assert.deepEqual(pickingGroup.pickOrders, [{ guid: "pick-1", name: "Pick 1" }]);
  assert.equal(cardReservationGroupStage(waitingGroup), "waiting");
  assert.equal(cardReservationGroupStage(collectedGroup), "collected");
  assert.equal(cardReservationGroupStage(mixedGroup), null);
});

test("list search escapes LIKE wildcards so they match literally", () => {
  assert.equal(containsLikePattern("Black Lotus"), "%Black Lotus%");
  assert.equal(containsLikePattern("100%_off\\"), "%100\\%\\_off\\\\%");
});

test("msUntilCardReservationHoldsLapse waits for the earliest future hold of an active reservation", () => {
  const now = Date.parse("2026-11-22T12:00:00.000Z");
  const reservations = [
    { status: "ready" as const, holdExpiresAt: "2026-11-22T12:10:00.000Z" },
    { status: "ready" as const, holdExpiresAt: "2026-11-22T12:05:00.000Z" },
    { status: "ready" as const, holdExpiresAt: "2026-11-22T11:00:00.000Z" },
    { status: "collected" as const, holdExpiresAt: "2026-11-22T12:01:00.000Z" },
    { status: "waiting" as const, holdExpiresAt: null },
  ];
  assert.equal(
    msUntilCardReservationHoldsLapse(reservations, now),
    5 * 60 * 1000 + CARD_RESERVATION_HOLD_LAPSE_REFETCH_DELAY_MS,
  );
  assert.equal(msUntilCardReservationHoldsLapse([], now), false);
  assert.equal(msUntilCardReservationHoldsLapse(undefined, now), false);
});
