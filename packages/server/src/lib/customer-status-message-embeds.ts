import {
  CARD_RESERVATION_HOLDER_QUEUE_POSITION,
  formatPriceInCurrency,
  myCardReservationRequestWebPath,
  sentTradeOfferWebPath,
} from "@magic-vault/shared";
import {
  CUSTOMER_STATUS_MESSAGE_FIELD_MAX_LENGTH,
  CUSTOMER_STATUS_MESSAGE_LINES_MAX,
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

function discordTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

function limitedLines(lines: string[]): string {
  const shown = lines.slice(0, CUSTOMER_STATUS_MESSAGE_LINES_MAX);
  const hiddenCount = lines.length - shown.length;
  const text = [...shown, ...(hiddenCount > 0 ? [`and ${hiddenCount} more`] : [])].join("\n");
  return text.length > CUSTOMER_STATUS_MESSAGE_FIELD_MAX_LENGTH
    ? `${text.slice(0, CUSTOMER_STATUS_MESSAGE_FIELD_MAX_LENGTH - 1)}…`
    : text;
}

export function reservationCardStatus(entry: ReservationStatusMessageCard): string {
  switch (entry.guestAlert) {
    case "held":
      return entry.holdExpiresAt
        ? `held for you until ${discordTimestamp(entry.holdExpiresAt)}`
        : "held for you";
    case "readyForPickup":
      return "ready for pickup";
    case "expired":
      return "your hold ran out";
    case "released":
      return "released by the shop";
    case "unavailable":
      return "no longer available";
    case null:
      if (entry.holdExpiresAt) return `held for you until ${discordTimestamp(entry.holdExpiresAt)}`;
      if (entry.queuePosition !== null) {
        const ahead = Math.max(entry.queuePosition - CARD_RESERVATION_HOLDER_QUEUE_POSITION, 0);
        return ahead === 1 ? "waiting, 1 person ahead of you" : `waiting, ${ahead} people ahead of you`;
      }
      return "waiting";
  }
}

export function reservationStatusEmbed(
  message: ReservationStatusMessage,
  webUrl: string,
  now: Date,
): DiscordEmbed {
  const url = `${webUrl}${myCardReservationRequestWebPath(message.requestGuid)}`;
  const shop = message.catalogName ? ` at ${message.catalogName}` : "";
  return {
    title:
      message.event === "created"
        ? `Reservation placed${shop}`
        : `Your reservation${shop} changed`,
    description: `[View your reservation](${url})`,
    url,
    color: TRADE_OFFER_EMBED_COLOR,
    timestamp: now.toISOString(),
    fields: [
      {
        name: message.event === "created" ? `Cards (${message.cards.length})` : "What changed",
        value: limitedLines(
          message.cards.map((entry) => `${cardLine(entry.card)}: ${reservationCardStatus(entry)}`),
        ),
      },
    ],
  };
}

const TRADE_OFFER_TITLES: Record<TradeOfferStatusMessage["event"], string> = {
  created: "Trade offer sent",
  accepted: "Your trade offer was accepted",
  declined: "Your trade offer was declined",
};

export function tradeOfferStatusEmbed(message: TradeOfferStatusMessage, webUrl: string): DiscordEmbed {
  const url = `${webUrl}${sentTradeOfferWebPath(message.offerGuid)}`;
  const offeredLines = [
    ...message.offered.map((card) => `${card.quantity} × ${cardLine(card)}`),
    ...(message.offeredCash
      ? [`${formatPriceInCurrency(message.offeredCash.amount, message.offeredCash.currency)} cash`]
      : []),
  ];
  return {
    title: TRADE_OFFER_TITLES[message.event],
    description: [
      message.sentToName ? `**Sent to:** ${message.sentToName}` : null,
      `[View your trade offer](${url})`,
    ]
      .filter((line) => line !== null)
      .join("\n"),
    url,
    color: TRADE_OFFER_EMBED_COLOR,
    timestamp: message.happenedAt.toISOString(),
    fields: [
      {
        name: `You asked for (${message.wanted.length})`,
        value: message.wanted.length ? limitedLines(message.wanted.map(cardLine)) : "Nothing",
      },
      {
        name: "You offered",
        value: offeredLines.length ? limitedLines(offeredLines) : "Nothing",
      },
    ],
  };
}
