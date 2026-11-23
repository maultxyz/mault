import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardReservationCard } from "@magic-vault/shared";
import {
  reservationStatusEmbed,
  reservationStatusLine,
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
  condition: "NM",
  isFoil: false,
  foilType: null,
};

test("reservation status lines say what happened to the customer's card", () => {
  const holdExpiresAt = new Date("2026-11-25T12:00:00.000Z");
  const message = (guestAlert: Parameters<typeof reservationStatusLine>[0]["guestAlert"]) =>
    reservationStatusLine({ discordUserId: "1", catalogName: "Shop", card, guestAlert, holdExpiresAt });
  assert.equal(
    message("held"),
    `**Lightning Bolt** (M10 146) is held for you until <t:${holdExpiresAt.getTime() / 1000}:f>.`,
  );
  assert.equal(message("readyForPickup"), "**Lightning Bolt** (M10 146) is ready for pickup.");
  assert.equal(message("expired"), "Your hold on **Lightning Bolt** (M10 146) ran out.");
  assert.equal(message("released"), "The shop released your reservation for **Lightning Bolt** (M10 146).");
  assert.equal(message("unavailable"), "**Lightning Bolt** (M10 146) is no longer available.");
});

test("a reservation message lists at most the line limit and links to My reservations", () => {
  const messages = Array.from({ length: CUSTOMER_STATUS_MESSAGE_LINES_MAX + 2 }, () => ({
    discordUserId: "1",
    catalogName: "Card Shop",
    card,
    guestAlert: "readyForPickup" as const,
    holdExpiresAt: null,
  }));
  const embed = reservationStatusEmbed(messages, "https://mault.xyz", new Date(0));
  assert.equal(embed.title, "Your reservations at Card Shop changed");
  assert.equal(embed.url, "https://mault.xyz/app/trades?box=reservations");
  const lines = embed.description!.split("\n");
  assert.equal(lines.length, CUSTOMER_STATUS_MESSAGE_LINES_MAX + 1);
  assert.equal(lines.at(-1), "- and 2 more");
});

test("a trade offer message says whether it was accepted and links to sent offers", () => {
  const embed = tradeOfferStatusEmbed(
    {
      discordUserId: "1",
      status: "declined",
      sentToName: "Binder",
      wantedCount: 3,
      respondedAt: new Date(0),
    },
    "https://mault.xyz",
  );
  assert.equal(embed.title, "Your trade offer was declined");
  assert.equal(embed.description, "**Sent to:** Binder\n**Cards you asked for:** 3");
  assert.equal(embed.url, "https://mault.xyz/app/trades?box=sent");
});
