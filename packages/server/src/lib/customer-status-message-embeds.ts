import {
  MY_CARD_RESERVATIONS_WEB_PATH,
  SENT_TRADE_OFFERS_WEB_PATH,
  type CardReservationCard,
} from "@magic-vault/shared";
import {
  CUSTOMER_STATUS_MESSAGE_LINES_MAX,
  TRADE_OFFER_EMBED_COLOR,
} from "./constants/discord";
import type {
  ClaimedReservationStatusMessage,
  ClaimedTradeOfferStatusMessage,
} from "./interfaces/customer-status-messages";
import type { DiscordEmbed } from "./interfaces/discord";

function cardLabel(card: CardReservationCard): string {
  const printing = [card.setCode.toUpperCase(), card.collectorNumber].filter(Boolean).join(" ");
  return printing ? `**${card.name}** (${printing})` : `**${card.name}**`;
}

function discordTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

export function reservationStatusLine(message: ClaimedReservationStatusMessage): string {
  const card = cardLabel(message.card);
  switch (message.guestAlert) {
    case "held":
      return message.holdExpiresAt
        ? `${card} is held for you until ${discordTimestamp(message.holdExpiresAt)}.`
        : `${card} is held for you.`;
    case "readyForPickup":
      return `${card} is ready for pickup.`;
    case "expired":
      return `Your hold on ${card} ran out.`;
    case "released":
      return `The shop released your reservation for ${card}.`;
    case "unavailable":
      return `${card} is no longer available.`;
  }
}

export function reservationStatusEmbed(
  messages: ClaimedReservationStatusMessage[],
  webUrl: string,
  now: Date,
): DiscordEmbed {
  const catalogName = messages[0]?.catalogName;
  const shown = messages.slice(0, CUSTOMER_STATUS_MESSAGE_LINES_MAX);
  const hiddenCount = messages.length - shown.length;
  return {
    title: catalogName
      ? `Your reservations at ${catalogName} changed`
      : "Your reservations changed",
    description: [
      ...shown.map((message) => `- ${reservationStatusLine(message)}`),
      ...(hiddenCount > 0 ? [`- and ${hiddenCount} more`] : []),
    ].join("\n"),
    url: `${webUrl}${MY_CARD_RESERVATIONS_WEB_PATH}`,
    color: TRADE_OFFER_EMBED_COLOR,
    timestamp: now.toISOString(),
  };
}

export function tradeOfferStatusEmbed(
  message: ClaimedTradeOfferStatusMessage,
  webUrl: string,
): DiscordEmbed {
  const answer = message.status === "accepted" ? "accepted" : "declined";
  return {
    title: `Your trade offer was ${answer}`,
    description: [
      message.sentToName ? `**Sent to:** ${message.sentToName}` : null,
      `**Cards you asked for:** ${message.wantedCount}`,
    ]
      .filter((line) => line !== null)
      .join("\n"),
    url: `${webUrl}${SENT_TRADE_OFFERS_WEB_PATH}`,
    color: TRADE_OFFER_EMBED_COLOR,
    timestamp: message.respondedAt.toISOString(),
  };
}
