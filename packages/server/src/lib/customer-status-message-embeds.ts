import {
  CARD_RESERVATION_HOLDER_QUEUE_POSITION,
  formatPriceInCurrency,
  myCardReservationRequestWebPath,
  sentTradeOfferWebPath,
  type CardReservationGuestAlert,
} from "@magic-vault/shared";
import {
  CUSTOMER_STATUS_MESSAGE_DESCRIPTION_MAX_LENGTH,
  CUSTOMER_STATUS_MESSAGE_FIELD_MAX_LENGTH,
  CUSTOMER_STATUS_MESSAGE_LINES_MAX,
  CUSTOMER_STATUS_MESSAGE_SHOP_FALLBACK_NAME,
  TRADE_OFFER_EMBED_COLOR,
} from "./constants/discord";
import type {
  CardLineInput,
  ReservationStatusMessage,
  ReservationStatusMessageCard,
  TradeOfferStatusMessage,
} from "./interfaces/customer-status-messages";
import type { DiscordEmbed } from "./interfaces/discord";

export function cardLine(card: CardLineInput): string {
  const printing = [card.setCode.toUpperCase(), card.collectorNumber].filter(Boolean).join(" ");
  const finish = card.isFoil ? (card.foilType ?? "Foil") : null;
  return [
    printing ? `**${card.name}** (${printing})` : `**${card.name}**`,
    card.condition,
    finish,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function discordTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

function discordFullTimestamp(date: Date): string {
  const seconds = Math.floor(date.getTime() / 1000);
  return `<t:${seconds}:F> (<t:${seconds}:R>)`;
}

export function limitedLines(lines: string[]): string {
  const shown = lines.slice(0, CUSTOMER_STATUS_MESSAGE_LINES_MAX);
  const hiddenCount = lines.length - shown.length;
  const text = [...shown, ...(hiddenCount > 0 ? [`and ${hiddenCount} more`] : [])].join("\n");
  return text.length > CUSTOMER_STATUS_MESSAGE_FIELD_MAX_LENGTH
    ? `${text.slice(0, CUSTOMER_STATUS_MESSAGE_FIELD_MAX_LENGTH - 1)}…`
    : text;
}

function bulletList(lines: string[]): string {
  return limitedLines(lines.map((line) => `• ${line}`));
}

function paragraphs(parts: (string | null)[]): string {
  const text = parts.filter((part): part is string => !!part).join("\n\n");
  return text.length > CUSTOMER_STATUS_MESSAGE_DESCRIPTION_MAX_LENGTH
    ? `${text.slice(0, CUSTOMER_STATUS_MESSAGE_DESCRIPTION_MAX_LENGTH - 1)}…`
    : text;
}

function greeting(customerName: string | null): string {
  return customerName ? `Hi ${customerName},` : "Hi there,";
}

function shopNameOf(message: { shopName: string | null }): string {
  return message.shopName || CUSTOMER_STATUS_MESSAGE_SHOP_FALLBACK_NAME;
}

function sentenceStart(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function peopleAhead(queuePosition: number): string {
  const ahead = Math.max(queuePosition - CARD_RESERVATION_HOLDER_QUEUE_POSITION, 0);
  return ahead === 1 ? "1 person ahead of you" : `${ahead} people ahead of you`;
}

function sharedHoldExpiry(cards: ReservationStatusMessageCard[]): Date | null {
  const times = new Set(cards.map((entry) => entry.holdExpiresAt?.getTime() ?? null));
  if (times.size !== 1) return null;
  const [time] = [...times];
  return time === null || time === undefined ? null : new Date(time);
}

function heldCardsSection(cards: ReservationStatusMessageCard[], heading: string): string | null {
  if (cards.length === 0) return null;
  const expiry = sharedHoldExpiry(cards);
  const lines = cards.map((entry) =>
    expiry || !entry.holdExpiresAt
      ? cardLine(entry.card)
      : `${cardLine(entry.card)}, held until ${discordTimestamp(entry.holdExpiresAt)}`,
  );
  return [
    heading,
    bulletList(lines),
    expiry ? `Your cards will be held until ${discordFullTimestamp(expiry)}.` : null,
  ]
    .filter((part): part is string => !!part)
    .join("\n");
}

function waitingCardsSection(cards: ReservationStatusMessageCard[], heading: string): string | null {
  if (cards.length === 0) return null;
  const lines = cards.map((entry) =>
    entry.queuePosition === null
      ? cardLine(entry.card)
      : `${cardLine(entry.card)}, ${peopleAhead(entry.queuePosition)}`,
  );
  return [
    heading,
    bulletList(lines),
    "We'll message you here as soon as one of them is held for you.",
  ].join("\n");
}

function plainCardsSection(cards: ReservationStatusMessageCard[], heading: string): string | null {
  if (cards.length === 0) return null;
  return [heading, bulletList(cards.map((entry) => cardLine(entry.card)))].join("\n");
}

function cardsWithAlert(
  message: ReservationStatusMessage,
  alert: CardReservationGuestAlert | null,
): ReservationStatusMessageCard[] {
  return message.cards.filter((entry) => entry.guestAlert === alert);
}

function createdReservationDescription(message: ReservationStatusMessage, url: string): string {
  const shop = shopNameOf(message);
  const held = message.cards.filter((entry) => entry.holdExpiresAt !== null);
  const waiting = message.cards.filter((entry) => entry.holdExpiresAt === null);
  return paragraphs([
    greeting(message.customerName),
    `Thank you for reserving cards with ${shop}! Here's what you reserved.`,
    heldCardsSection(held, `**Held for you (${held.length})**`),
    waitingCardsSection(waiting, `**In line for you (${waiting.length})**`),
    `[View your reservation](${url})`,
  ]);
}

function changedReservationDescription(message: ReservationStatusMessage, url: string): string {
  const shop = shopNameOf(message);
  const held = cardsWithAlert(message, "held");
  const readyForPickup = cardsWithAlert(message, "readyForPickup");
  const expired = cardsWithAlert(message, "expired");
  const released = cardsWithAlert(message, "released");
  const unavailable = cardsWithAlert(message, "unavailable");
  const waiting = cardsWithAlert(message, null);
  return paragraphs([
    greeting(message.customerName),
    `Here's an update on your reservation with ${shop}.`,
    heldCardsSection(held, "Good news, these cards are now held for you:"),
    plainCardsSection(readyForPickup, `These cards are ready for you to pick up at ${shop}:`),
    plainCardsSection(expired, "Your hold ran out on these cards:"),
    plainCardsSection(released, `${sentenceStart(shop)} released these cards from your reservation:`),
    plainCardsSection(unavailable, "Sorry, these cards are no longer available:"),
    waitingCardsSection(waiting, "You're still in line for these cards:"),
    `Thanks for shopping with ${shop}!`,
    `[View your reservation](${url})`,
  ]);
}

export function reservationStatusEmbed(
  message: ReservationStatusMessage,
  webUrl: string,
  now: Date,
): DiscordEmbed {
  const url = `${webUrl}${myCardReservationRequestWebPath(message.requestGuid)}`;
  const shop = shopNameOf(message);
  const isCreated = message.event === "created";
  return {
    title: isCreated
      ? `Thank you for reserving cards with ${shop}`
      : `Update on your reservation with ${shop}`,
    description: isCreated
      ? createdReservationDescription(message, url)
      : changedReservationDescription(message, url),
    url,
    color: TRADE_OFFER_EMBED_COLOR,
    timestamp: now.toISOString(),
    ...(message.catalogName && message.catalogName !== shop
      ? { footer: { text: message.catalogName } }
      : {}),
  };
}

function tradeOfferTitle(message: TradeOfferStatusMessage, shop: string): string {
  switch (message.event) {
    case "created":
      return `Thank you for your trade offer to ${shop}`;
    case "accepted":
      return `${sentenceStart(shop)} accepted your trade offer`;
    case "declined":
      return `${sentenceStart(shop)} declined your trade offer`;
  }
}

function tradeOfferIntro(message: TradeOfferStatusMessage, shop: string): string {
  switch (message.event) {
    case "created":
      return `Thank you for sending a trade offer to ${shop}! They'll review it, and we'll message you here as soon as they reply.`;
    case "accepted":
      return `Great news: ${shop} accepted your trade offer! Here's what was agreed.`;
    case "declined":
      return `${sentenceStart(shop)} declined your trade offer this time. Here's what it included.`;
  }
}

export function tradeOfferStatusEmbed(message: TradeOfferStatusMessage, webUrl: string): DiscordEmbed {
  const url = `${webUrl}${sentTradeOfferWebPath(message.offerGuid)}`;
  const shop = shopNameOf(message);
  const offeredLines = [
    ...message.offered.map((card) => `${card.quantity} × ${cardLine(card)}`),
    ...(message.offeredCash
      ? [`${formatPriceInCurrency(message.offeredCash.amount, message.offeredCash.currency)} cash`]
      : []),
  ];
  return {
    title: tradeOfferTitle(message, shop),
    description: paragraphs([
      greeting(message.customerName),
      tradeOfferIntro(message, shop),
      `**You asked for (${message.wanted.length})**\n${
        message.wanted.length ? bulletList(message.wanted.map(cardLine)) : "Nothing"
      }`,
      `**You offered**\n${offeredLines.length ? bulletList(offeredLines) : "Nothing"}`,
      message.event === "declined"
        ? "Thanks for the offer. You're welcome to send another one anytime."
        : null,
      `[View your trade offer](${url})`,
    ]),
    url,
    color: TRADE_OFFER_EMBED_COLOR,
    timestamp: message.happenedAt.toISOString(),
    ...(message.sentToName ? { footer: { text: `Sent to ${message.sentToName}` } } : {}),
  };
}
