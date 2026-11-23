import {
  CARD_RESERVATION_ACTIVE_STATUSES,
  formatPriceInCurrency,
  groupReservationsByRequestGuid,
  MY_CARD_RESERVATIONS_WEB_PATH,
  myCardReservationRequestWebPath,
  SENT_TRADE_OFFERS_WEB_PATH,
  sentTradeOfferWebPath,
  type MyCardReservation,
  type OutgoingTradeOffer,
  type TradeOfferStatus,
} from "@magic-vault/shared";
import {
  CUSTOMER_LIST_EMBED_CARD_PREVIEW_MAX,
  CUSTOMER_LIST_EMBED_ENTRIES_MAX,
  TRADE_OFFER_EMBED_COLOR,
} from "./constants/discord";
import {
  cardLine,
  discordTimestamp,
  limitedLines,
  peopleAhead,
} from "./customer-status-message-embeds";
import type { DiscordEmbed } from "./interfaces/discord";

const activeStatuses: readonly string[] = CARD_RESERVATION_ACTIVE_STATUSES;

function relativeTimestamp(iso: string): string {
  return `<t:${Math.floor(new Date(iso).getTime() / 1000)}:R>`;
}

function reservationStatusText(reservation: MyCardReservation): string {
  if (reservation.isReadyForPickup) return "ready for pickup";
  if (reservation.status === "ready") {
    return reservation.holdExpiresAt
      ? `held for you until ${discordTimestamp(new Date(reservation.holdExpiresAt))}`
      : "held for you";
  }
  return reservation.queuePosition === null
    ? "in line"
    : `in line, ${peopleAhead(reservation.queuePosition)}`;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function myReservationsEmbed(reservations: MyCardReservation[], webUrl: string): DiscordEmbed {
  const active = reservations.filter((reservation) => activeStatuses.includes(reservation.status));
  const requests = groupReservationsByRequestGuid(active);
  const shown = requests.slice(0, CUSTOMER_LIST_EMBED_ENTRIES_MAX);
  const listUrl = `${webUrl}${MY_CARD_RESERVATIONS_WEB_PATH}`;
  const summary =
    active.length === 0
      ? "You don't have any active reservations right now."
      : `You have ${countLabel(active.length, "card", "cards")} reserved across ${countLabel(requests.length, "reservation", "reservations")}.`;
  const hiddenCount = requests.length - shown.length;
  return {
    title: "Your reservations",
    url: listUrl,
    color: TRADE_OFFER_EMBED_COLOR,
    description: [
      summary,
      hiddenCount > 0 ? `Showing the newest ${shown.length}.` : null,
      `[Open My reservations](${listUrl})`,
    ]
      .filter((line): line is string => !!line)
      .join("\n"),
    fields: shown.map(({ requestGuid, reservations: cards }) => {
      const first = cards[0];
      return {
        name: first?.catalogName || "Reservation",
        value: limitedLines([
          `Placed ${relativeTimestamp(first?.createdAt ?? new Date().toISOString())}`,
          ...cards.map((reservation) => `• ${cardLine(reservation.card)}: ${reservationStatusText(reservation)}`),
          `[View this reservation](${webUrl}${myCardReservationRequestWebPath(requestGuid)})`,
        ]),
      };
    }),
  };
}

const TRADE_OFFER_STATUS_LABELS: Record<TradeOfferStatus, string> = {
  pending: "Waiting for a reply",
  accepted: "Accepted",
  declined: "Declined",
};

function cardPreview(names: string[]): string {
  const shown = names.slice(0, CUSTOMER_LIST_EMBED_CARD_PREVIEW_MAX);
  const hiddenCount = names.length - shown.length;
  return [shown.join(", "), hiddenCount > 0 ? `and ${hiddenCount} more` : null]
    .filter((part): part is string => !!part)
    .join(" ");
}

function offeredSummary(offer: OutgoingTradeOffer): string {
  const cards = offer.offered.map((card) =>
    card.quantity > 1 ? `${card.quantity} × ${card.name}` : card.name,
  );
  const cash = offer.offeredCash
    ? `${formatPriceInCurrency(offer.offeredCash.amount, offer.offeredCash.currency)} cash`
    : null;
  const parts = [cards.length ? cardPreview(cards) : null, cash].filter(
    (part): part is string => !!part,
  );
  return parts.length ? parts.join(" plus ") : "Nothing";
}

export function myTradeOffersEmbed(offers: OutgoingTradeOffer[], webUrl: string): DiscordEmbed {
  const ordered = [
    ...offers.filter((offer) => offer.status === "pending"),
    ...offers.filter((offer) => offer.status !== "pending"),
  ];
  const shown = ordered.slice(0, CUSTOMER_LIST_EMBED_ENTRIES_MAX);
  const pendingCount = offers.filter((offer) => offer.status === "pending").length;
  const listUrl = `${webUrl}${SENT_TRADE_OFFERS_WEB_PATH}`;
  const summary =
    offers.length === 0
      ? "You haven't sent any trade offers yet."
      : pendingCount > 0
        ? `${countLabel(pendingCount, "offer is", "offers are")} waiting for a reply.`
        : "None of your offers are waiting for a reply.";
  const hiddenCount = ordered.length - shown.length;
  return {
    title: "Your trade offers",
    url: listUrl,
    color: TRADE_OFFER_EMBED_COLOR,
    description: [
      summary,
      hiddenCount > 0 ? `Showing ${shown.length} of ${ordered.length}.` : null,
      `[Open Sent offers](${listUrl})`,
    ]
      .filter((line): line is string => !!line)
      .join("\n"),
    fields: shown.map((offer) => ({
      name: [TRADE_OFFER_STATUS_LABELS[offer.status], offer.sentToName].filter(Boolean).join(" · "),
      value: limitedLines([
        offer.respondedAt && offer.status !== "pending"
          ? `Sent ${relativeTimestamp(offer.createdAt)}, answered ${relativeTimestamp(offer.respondedAt)}`
          : `Sent ${relativeTimestamp(offer.createdAt)}`,
        `**You asked for:** ${offer.wanted.length ? cardPreview(offer.wanted.map((card) => card.name)) : "Nothing"}`,
        `**You offered:** ${offeredSummary(offer)}`,
        `[View this offer](${webUrl}${sentTradeOfferWebPath(offer.guid)})`,
      ]),
    })),
  };
}
