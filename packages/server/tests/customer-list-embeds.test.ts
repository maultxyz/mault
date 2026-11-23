import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  CardReservationCard,
  MyCardReservation,
  OutgoingTradeOffer,
} from "@magic-vault/shared";
import { myReservationsEmbed, myTradeOffersEmbed } from "../src/lib/customer-list-embeds";

const card: CardReservationCard = {
  gameKey: "mtg",
  name: "Lightning Bolt",
  setCode: "m10",
  setName: "Magic 2010",
  collectorNumber: "146",
  imageUrl: null,
  condition: "LP",
  isFoil: false,
  foilType: null,
};

function reservation(overrides: Partial<MyCardReservation>): MyCardReservation {
  return {
    guid: "reservation-1",
    requestGuid: "request-1",
    scanId: null,
    card,
    status: "ready",
    queuePosition: 1,
    queueLength: 1,
    holdExpiresAt: "2026-11-28T17:00:00.000Z",
    isReadyForPickup: false,
    createdAt: "2026-11-23T17:00:00.000Z",
    closedAt: null,
    catalogName: "Bob's Cards",
    catalogUrl: null,
    guestName: "Alex",
    guestAlert: null,
    guestAlertAt: null,
    ...overrides,
  };
}

test("my reservations lists active requests with each card's standing and skips closed ones", () => {
  const embed = myReservationsEmbed(
    [
      reservation({}),
      reservation({ guid: "reservation-2", status: "waiting", holdExpiresAt: null, queuePosition: 3 }),
      reservation({ guid: "reservation-3", requestGuid: "request-2", status: "collected" }),
    ],
    "https://mault.xyz",
  );
  assert.equal(embed.title, "Your reservations");
  assert.ok(embed.description?.startsWith("You have 2 cards reserved across 1 reservation."));
  assert.equal(embed.fields?.length, 1);
  const value = embed.fields?.[0]?.value ?? "";
  assert.equal(embed.fields?.[0]?.name, "Bob's Cards");
  assert.ok(value.includes("• **Lightning Bolt** (M10 146) · LP: held for you until <t:"));
  assert.ok(value.includes("in line, 2 people ahead of you"));
  assert.ok(value.includes("(https://mault.xyz/app/trades?box=reservations&request=request-1)"));
});

test("my reservations says when there are none", () => {
  const embed = myReservationsEmbed([], "https://mault.xyz");
  assert.ok(embed.description?.startsWith("You don't have any active reservations right now."));
  assert.deepEqual(embed.fields, []);
});

test("my trade offers puts pending offers first and summarizes both sides", () => {
  const offer = (overrides: Partial<OutgoingTradeOffer>): OutgoingTradeOffer => ({
    guid: "offer-1",
    status: "pending",
    wanted: [{ ...card, scanId: "scan-1" }],
    offered: [],
    offeredCash: { amount: 5, currency: "USD" },
    createdAt: "2026-11-20T17:00:00.000Z",
    respondedAt: null,
    linkKind: "collection",
    sentToName: "Binder",
    guestName: "Alex",
    guestContact: "",
    guestNote: null,
    ...overrides,
  });
  const embed = myTradeOffersEmbed(
    [
      offer({ guid: "offer-old", status: "declined", respondedAt: "2026-11-21T17:00:00.000Z" }),
      offer({ guid: "offer-new" }),
    ],
    "https://mault.xyz",
  );
  assert.ok(embed.description?.startsWith("1 offer is waiting for a reply."));
  assert.equal(embed.fields?.[0]?.name, "Waiting for a reply · Binder");
  assert.equal(embed.fields?.[1]?.name, "Declined · Binder");
  const value = embed.fields?.[0]?.value ?? "";
  assert.ok(value.includes("**You asked for:** Lightning Bolt"));
  assert.match(value, /\*\*You offered:\*\* .*5.* cash/);
  assert.ok(value.includes("(https://mault.xyz/app/trades/sent/offer-new)"));
});
