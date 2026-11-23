import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardReservationCard, TradeOfferWantedCard } from "@magic-vault/shared";
import {
  cardLine,
  reservationCardStatus,
  reservationStatusEmbed,
  tradeOfferStatusEmbed,
} from "../src/lib/customer-status-message-embeds";
import { CUSTOMER_STATUS_MESSAGE_LINES_MAX } from "../src/lib/constants/discord";

const card: CardReservationCard = {
  gameKey: "mtg",
  name: "Lightning Bolt",
  setCode: "m10",
  setName: "Magic 2010",
  collectorNumber: "146",
  imageUrl: null,
  condition: "LP",
  isFoil: true,
  foilType: null,
};

const wantedCard: TradeOfferWantedCard = { ...card, scanId: "scan-1" };

test("card lines show the printing, condition and finish", () => {
  assert.equal(cardLine(card), "**Lightning Bolt** (M10 146) · LP · Foil");
  assert.equal(
    cardLine({ ...card, isFoil: false, setCode: "", collectorNumber: "" }),
    "**Lightning Bolt** · LP",
  );
});

test("reservation card statuses say what happened, or where the card stands when placed", () => {
  const holdExpiresAt = new Date("2026-11-25T12:00:00.000Z");
  const status = (overrides: Partial<Parameters<typeof reservationCardStatus>[0]>) =>
    reservationCardStatus({ card, guestAlert: null, holdExpiresAt: null, queuePosition: null, ...overrides });
  assert.equal(
    status({ guestAlert: "held", holdExpiresAt }),
    `held for you until <t:${holdExpiresAt.getTime() / 1000}:f>`,
  );
  assert.equal(status({ guestAlert: "readyForPickup" }), "ready for pickup");
  assert.equal(status({ guestAlert: "expired" }), "your hold ran out");
  assert.equal(status({ guestAlert: "released" }), "released by the shop");
  assert.equal(status({ guestAlert: "unavailable" }), "no longer available");
  assert.equal(status({ queuePosition: 2 }), "waiting, 1 person ahead of you");
  assert.equal(status({ queuePosition: 4 }), "waiting, 3 people ahead of you");
});

test("a reservation message lists the cards and links to that request", () => {
  const embed = reservationStatusEmbed(
    {
      discordUserId: "1",
      event: "created",
      catalogName: "Card Shop",
      requestGuid: "request-1",
      cards: Array.from({ length: CUSTOMER_STATUS_MESSAGE_LINES_MAX + 2 }, () => ({
        card,
        guestAlert: null,
        holdExpiresAt: null,
        queuePosition: 2,
      })),
    },
    "https://mault.xyz",
    new Date(0),
  );
  const url = "https://mault.xyz/app/trades?box=reservations&request=request-1";
  assert.equal(embed.title, "Reservation placed at Card Shop");
  assert.equal(embed.url, url);
  assert.equal(embed.description, `[View your reservation](${url})`);
  const lines = embed.fields![0].value.split("\n");
  assert.equal(embed.fields![0].name, `Cards (${CUSTOMER_STATUS_MESSAGE_LINES_MAX + 2})`);
  assert.equal(lines.length, CUSTOMER_STATUS_MESSAGE_LINES_MAX + 1);
  assert.equal(lines[0], "**Lightning Bolt** (M10 146) · LP · Foil: waiting, 1 person ahead of you");
  assert.equal(lines.at(-1), "and 2 more");
});

test("a trade offer message lists both sides with cash and links to the offer", () => {
  const embed = tradeOfferStatusEmbed(
    {
      discordUserId: "1",
      event: "accepted",
      offerGuid: "offer-1",
      sentToName: "Binder",
      wanted: [wantedCard],
      offered: [
        {
          gameKey: "mtg",
          lang: "en",
          cardId: "c1",
          name: "Shock",
          setCode: "m19",
          setName: "Core Set 2019",
          collectorNumber: "156",
          imageUrl: null,
          quantity: 2,
          condition: "NM",
          isFoil: false,
        },
      ],
      offeredCash: { amount: 5, currency: "USD" },
      happenedAt: new Date(0),
    },
    "https://mault.xyz",
  );
  const url = "https://mault.xyz/app/trades/sent/offer-1";
  assert.equal(embed.title, "Your trade offer was accepted");
  assert.equal(embed.url, url);
  assert.equal(embed.description, `**Sent to:** Binder\n[View your trade offer](${url})`);
  assert.deepEqual(
    embed.fields!.map((field) => field.name),
    ["You asked for (1)", "You offered"],
  );
  assert.equal(embed.fields![0].value, "**Lightning Bolt** (M10 146) · LP · Foil");
  assert.match(embed.fields![1].value, /^2 × \*\*Shock\*\* \(M19 156\) · NM\n.*5.* cash$/);
});

test("a trade offer with nothing offered says so", () => {
  const embed = tradeOfferStatusEmbed(
    {
      discordUserId: "1",
      event: "created",
      offerGuid: "offer-2",
      sentToName: null,
      wanted: [wantedCard],
      offered: [],
      offeredCash: null,
      happenedAt: new Date(0),
    },
    "https://mault.xyz",
  );
  assert.equal(embed.title, "Trade offer sent");
  assert.equal(embed.fields![1].value, "Nothing");
});
