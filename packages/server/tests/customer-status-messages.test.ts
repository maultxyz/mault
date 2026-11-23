import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardReservationCard, TradeOfferWantedCard } from "@magic-vault/shared";
import {
  cardLine,
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

const names = {
  orgId: "org-1",
  customerUserId: "user-1",
  shopName: "Bob's Cards",
  customerName: "Alex",
};

test("card lines show the printing, condition and finish", () => {
  assert.equal(cardLine(card), "**Lightning Bolt** (M10 146) · LP · Foil");
  assert.equal(
    cardLine({ ...card, isFoil: false, setCode: "", collectorNumber: "" }),
    "**Lightning Bolt** · LP",
  );
});

test("a placed reservation thanks the customer, lists the cards and says how long they're held", () => {
  const holdExpiresAt = new Date("2026-11-28T17:00:00.000Z");
  const seconds = holdExpiresAt.getTime() / 1000;
  const embed = reservationStatusEmbed(
    {
      discordUserId: "1",
      ...names,
      event: "created",
      catalogName: "Main catalog",
      requestGuid: "request-1",
      cards: [
        { card, guestAlert: null, holdExpiresAt, queuePosition: null },
        { card, guestAlert: null, holdExpiresAt, queuePosition: null },
        { card, guestAlert: null, holdExpiresAt: null, queuePosition: 2 },
      ],
    },
    "https://mault.xyz",
    new Date(0),
  );
  const url = "https://mault.xyz/app/trades?box=reservations&request=request-1";
  const description = embed.description ?? "";
  assert.equal(embed.title, "Thank you for reserving cards with Bob's Cards");
  assert.equal(embed.url, url);
  assert.equal(embed.footer?.text, "Main catalog");
  assert.ok(description.startsWith("Hi Alex,\n\nThank you for reserving cards with Bob's Cards!"));
  assert.ok(description.includes("**Held for you (2)**\n• **Lightning Bolt** (M10 146) · LP · Foil"));
  assert.ok(description.includes(`Your cards will be held until <t:${seconds}:F> (<t:${seconds}:R>).`));
  assert.ok(
    description.includes(
      "**In line for you (1)**\n• **Lightning Bolt** (M10 146) · LP · Foil, 1 person ahead of you",
    ),
  );
  assert.ok(description.endsWith(`[View your reservation](${url})`));
});

test("cards held until different times show each card's time", () => {
  const first = new Date("2026-11-28T17:00:00.000Z");
  const second = new Date("2026-11-29T17:00:00.000Z");
  const embed = reservationStatusEmbed(
    {
      discordUserId: "1",
      ...names,
      event: "created",
      catalogName: null,
      requestGuid: "request-1",
      cards: [
        { card, guestAlert: null, holdExpiresAt: first, queuePosition: null },
        { card, guestAlert: null, holdExpiresAt: second, queuePosition: null },
      ],
    },
    "https://mault.xyz",
    new Date(0),
  );
  const description = embed.description ?? "";
  assert.ok(description.includes(`, held until <t:${second.getTime() / 1000}:f>`));
  assert.ok(!description.includes("Your cards will be held until"));
});

test("long card lists are cut off with a count of the rest", () => {
  const embed = reservationStatusEmbed(
    {
      discordUserId: "1",
      ...names,
      event: "created",
      catalogName: null,
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
  assert.ok((embed.description ?? "").includes("\nand 2 more"));
  assert.equal(embed.footer, undefined);
});

test("a reservation update groups cards by what happened and greets unnamed customers", () => {
  const embed = reservationStatusEmbed(
    {
      discordUserId: "1",
      ...names,
      shopName: null,
      customerName: null,
      event: "changed",
      catalogName: null,
      requestGuid: "request-1",
      cards: [
        { card, guestAlert: "readyForPickup", holdExpiresAt: null, queuePosition: null },
        { card, guestAlert: "released", holdExpiresAt: null, queuePosition: null },
      ],
    },
    "https://mault.xyz",
    new Date(0),
  );
  const description = embed.description ?? "";
  assert.equal(embed.title, "Update on your reservation with the shop");
  assert.ok(description.startsWith("Hi there,"));
  assert.ok(description.includes("These cards are ready for you to pick up at the shop:"));
  assert.ok(description.includes("The shop released these cards from your reservation:"));
});

test("an accepted trade offer names the shop and lists both sides with cash", () => {
  const embed = tradeOfferStatusEmbed(
    {
      discordUserId: "1",
      ...names,
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
  const description = embed.description ?? "";
  assert.equal(embed.title, "Bob's Cards accepted your trade offer");
  assert.equal(embed.url, url);
  assert.equal(embed.footer?.text, "Sent to Binder");
  assert.ok(description.startsWith("Hi Alex,\n\nGreat news: Bob's Cards accepted your trade offer!"));
  assert.ok(description.includes("**You asked for (1)**\n• **Lightning Bolt** (M10 146) · LP · Foil"));
  assert.match(description, /\*\*You offered\*\*\n• 2 × \*\*Shock\*\* \(M19 156\) · NM\n• .*5.* cash/);
  assert.ok(description.endsWith(`[View your trade offer](${url})`));
});

test("a sent trade offer with nothing offered says so", () => {
  const embed = tradeOfferStatusEmbed(
    {
      discordUserId: "1",
      ...names,
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
  assert.equal(embed.title, "Thank you for your trade offer to Bob's Cards");
  assert.ok((embed.description ?? "").includes("**You offered**\nNothing"));
});
