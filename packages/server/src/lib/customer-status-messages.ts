import {
  cardReservationQueuePositions,
  type StatusMessageKind,
  type StatusMessageSettings,
  type StatusMessageSettingsUpdate,
} from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { customerStatusMessages } from "../db/schema";
import { CUSTOMER_STATUS_MESSAGES_DELAY_MS } from "./constants/timing";
import { getWebUrl } from "./constants/urls";
import {
  reservationStatusEmbed,
  tradeOfferStatusEmbed,
} from "./customer-status-message-embeds";
import { isDiscordBotConfigured, sendDiscordDirectMessage } from "./discord/direct-messages";
import { loadDiscordUserLink } from "./discord/user-links";
import { cardReservationQueuesByCard } from "./card-reservation-settlement";
import { loadActiveCardReservationRows } from "./card-reservations";
import { cachedDisplayName } from "./display-name-cache";
import { CUSTOMER_STATUS_MESSAGE_UNKNOWN_NAME } from "./constants/discord";
import type {
  ReservationMessageRow,
  ReservationStatusMessage,
  TradeOfferMessageRow,
  TradeOfferStatusMessage,
} from "./interfaces/customer-status-messages";

const scheduledDispatches = new Map<string, ReturnType<typeof setTimeout>>();
const runningDispatches = new Set<string>();
const dispatchesToRerun = new Set<string>();

export async function loadStatusMessageSettings(userId: string): Promise<StatusMessageSettings> {
  const [row] = await db
    .select()
    .from(customerStatusMessages)
    .where(eq(customerStatusMessages.userId, userId))
    .limit(1);
  const discordLink = await loadDiscordUserLink(userId);
  return {
    isAvailable: isDiscordBotConfigured(),
    isDiscordLinked: discordLink !== null,
    tradeOffers: !!row?.tradeOffersEnabledAt,
    cardReservations: !!row?.cardReservationsEnabledAt,
  };
}

export async function updateStatusMessageSettings(
  userId: string,
  update: StatusMessageSettingsUpdate,
): Promise<void> {
  const now = new Date();
  const enabledAtUpdate = (
    isEnabled: boolean | undefined,
    column: typeof customerStatusMessages.tradeOffersEnabledAt,
  ) => (isEnabled === undefined ? undefined : isEnabled ? sql`COALESCE(${column}, ${now.toISOString()}::timestamp)` : null);
  await db
    .insert(customerStatusMessages)
    .values({
      userId,
      tradeOffersEnabledAt: update.tradeOffers ? now : null,
      cardReservationsEnabledAt: update.cardReservations ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: customerStatusMessages.userId,
      set: {
        tradeOffersEnabledAt: enabledAtUpdate(
          update.tradeOffers,
          customerStatusMessages.tradeOffersEnabledAt,
        ),
        cardReservationsEnabledAt: enabledAtUpdate(
          update.cardReservations,
          customerStatusMessages.cardReservationsEnabledAt,
        ),
        updatedAt: now,
      },
    });
}

function customerFirstName(displayName: string): string | null {
  const firstName = displayName.trim().split(/\s+/)[0] ?? "";
  return firstName && firstName !== CUSTOMER_STATUS_MESSAGE_UNKNOWN_NAME ? firstName : null;
}

function epochToDate(epoch: number | null): Date | null {
  return epoch === null ? null : new Date(Number(epoch) * 1000);
}

async function queuePositionsOf(orgId: string): Promise<Map<number, number>> {
  const queues = await db.transaction(async (tx) =>
    cardReservationQueuesByCard(await loadActiveCardReservationRows(tx, orgId)),
  );
  const positions = new Map<number, number>();
  for (const queue of queues.values()) {
    for (const [id, position] of cardReservationQueuePositions(queue)) positions.set(id, position);
  }
  return positions;
}

function toReservationMessages(
  rows: ReservationMessageRow[],
  event: ReservationStatusMessage["event"],
  queuePositions: Map<number, number>,
): ReservationStatusMessage[] {
  const messages = new Map<string, ReservationStatusMessage>();
  for (const row of rows) {
    const key = `${row.discord_user_id}\u0000${row.request_guid}`;
    const message = messages.get(key) ?? {
      discordUserId: row.discord_user_id,
      orgId: row.org_id,
      customerUserId: row.guest_user_id,
      shopName: null,
      customerName: null,
      event,
      catalogName: row.catalog_name,
      requestGuid: row.request_guid,
      cards: [],
    };
    message.cards.push({
      card: row.card,
      guestAlert: event === "changed" ? row.guest_alert : null,
      holdExpiresAt: row.status === "ready" ? epochToDate(row.hold_expires_at_epoch) : null,
      queuePosition:
        row.status === "waiting" ? (queuePositions.get(row.reservation_id) ?? null) : null,
    });
    messages.set(key, message);
  }
  return [...messages.values()];
}

function toTradeOfferMessage(
  row: TradeOfferMessageRow,
  event: TradeOfferStatusMessage["event"],
): TradeOfferStatusMessage {
  return {
    discordUserId: row.discord_user_id,
    orgId: row.org_id,
    customerUserId: row.guest_user_id,
    shopName: null,
    customerName: null,
    event,
    offerGuid: row.guid,
    sentToName: row.sent_to_name,
    wanted: row.wanted_cards ?? [],
    offered: row.offered_cards ?? [],
    offeredCash:
      row.offered_cash_amount != null && row.offered_cash_currency
        ? { amount: Number(row.offered_cash_amount), currency: row.offered_cash_currency }
        : null,
    happenedAt: epochToDate(row.happened_at_epoch) ?? new Date(),
  };
}

const RESERVATION_MESSAGE_COLUMNS = sql`
  messaged.discord_user_id, messaged.org_id, messaged.guest_user_id,
  messaged.request_guid, catalog.name AS catalog_name,
  messaged.collection_card_id, messaged.id AS reservation_id, messaged.card,
  messaged.guest_alert, messaged.status,
  extract(epoch FROM messaged.hold_expires_at)::float8 AS hold_expires_at_epoch`;

const TRADE_OFFER_MESSAGE_COLUMNS = sql`
  messaged.discord_user_id, messaged.org_id, messaged.guest_user_id,
  messaged.guid, messaged.status,
  COALESCE(collection.name, location.name) AS sent_to_name,
  messaged.wanted_cards, messaged.offered_cards,
  messaged.offered_cash_amount, messaged.offered_cash_currency`;

const TRADE_OFFER_SENT_TO_JOINS = sql`
  LEFT JOIN collections collection
    ON collection.id = messaged.collection_id AND collection.org_id = messaged.org_id
      AND collection.is_deleted = false
  LEFT JOIN storage_locations location
    ON location.id = messaged.storage_location_id AND location.org_id = messaged.org_id
      AND location.is_deleted = false`;

async function claimReservationStatusMessages(orgId: string): Promise<ReservationStatusMessage[]> {
  const claimed = await db.execute<ReservationMessageRow>(sql`
    WITH messaged AS (
      UPDATE card_reservations reservation
      SET guest_alert_messaged_at = reservation.guest_alert_at
      FROM customer_status_messages settings, discord_user_links discord_link
      WHERE reservation.org_id = ${orgId}
        AND reservation.guest_alert IS NOT NULL
        AND reservation.guest_user_id IS NOT NULL
        AND reservation.guest_alert_at IS DISTINCT FROM reservation.guest_alert_messaged_at
        AND settings.user_id = reservation.guest_user_id
        AND settings.card_reservations_enabled_at IS NOT NULL
        AND reservation.guest_alert_at > settings.card_reservations_enabled_at
        AND discord_link.user_id = reservation.guest_user_id
        AND discord_link.discord_user_id IS NOT NULL
        AND discord_link.linked_at IS NOT NULL
      RETURNING reservation.*, discord_link.discord_user_id
    )
    SELECT ${RESERVATION_MESSAGE_COLUMNS}
    FROM messaged
    LEFT JOIN shop_catalogs catalog
      ON catalog.id = messaged.shop_catalog_id AND catalog.is_deleted = false
    ORDER BY messaged.id
  `);
  if (claimed.rows.length === 0) return [];
  return toReservationMessages(claimed.rows, "changed", await queuePositionsOf(orgId));
}

async function claimTradeOfferStatusMessages(orgId: string): Promise<TradeOfferStatusMessage[]> {
  const claimed = await db.execute<TradeOfferMessageRow>(sql`
    WITH messaged AS (
      UPDATE trade_offers offer
      SET status_messaged_at = offer.responded_at
      FROM customer_status_messages settings, discord_user_links discord_link
      WHERE offer.org_id = ${orgId}
        AND offer.status_messaged_at IS NULL
        AND offer.responded_at IS NOT NULL
        AND offer.guest_user_id IS NOT NULL
        AND offer.status <> 'pending'
        AND settings.user_id = offer.guest_user_id
        AND settings.trade_offers_enabled_at IS NOT NULL
        AND offer.responded_at > settings.trade_offers_enabled_at
        AND discord_link.user_id = offer.guest_user_id
        AND discord_link.discord_user_id IS NOT NULL
        AND discord_link.linked_at IS NOT NULL
      RETURNING offer.*, discord_link.discord_user_id
    )
    SELECT ${TRADE_OFFER_MESSAGE_COLUMNS},
      extract(epoch FROM messaged.responded_at)::float8 AS happened_at_epoch
    FROM messaged
    ${TRADE_OFFER_SENT_TO_JOINS}
    ORDER BY messaged.id
  `);
  return claimed.rows.map((row) =>
    toTradeOfferMessage(row, row.status === "accepted" ? "accepted" : "declined"),
  );
}

async function withNames<Message extends ReservationStatusMessage | TradeOfferStatusMessage>(
  messages: Message[],
): Promise<Message[]> {
  if (messages.length === 0) return messages;
  const orgIds = [...new Set(messages.map((message) => message.orgId))];
  const customerUserIds = [...new Set(messages.map((message) => message.customerUserId))];
  const [shopNames, customerNames] = await Promise.all([
    authProvider.getOrganisationNames(orgIds).catch(() => new Map<string, string>()),
    Promise.all(
      customerUserIds.map(
        async (userId) =>
          [userId, await cachedDisplayName(userId, (id) => authProvider.getUserDisplayName(id))] as const,
      ),
    ),
  ]);
  const firstNames = new Map(customerNames.map(([userId, name]) => [userId, customerFirstName(name)]));
  return messages.map((message) => ({
    ...message,
    shopName: shopNames.get(message.orgId)?.trim() || null,
    customerName: firstNames.get(message.customerUserId) ?? null,
  }));
}

async function sendReservationMessages(messages: ReservationStatusMessage[]) {
  const now = new Date();
  for (const message of await withNames(messages)) {
    await sendDiscordDirectMessage(message.discordUserId, reservationStatusEmbed(message, getWebUrl(), now));
  }
}

async function sendTradeOfferMessages(messages: TradeOfferStatusMessage[]) {
  for (const message of await withNames(messages)) {
    await sendDiscordDirectMessage(message.discordUserId, tradeOfferStatusEmbed(message, getWebUrl()));
  }
}

async function sendReservationStatusMessages(orgId: string) {
  await sendReservationMessages(await claimReservationStatusMessages(orgId));
}

async function sendTradeOfferStatusMessages(orgId: string) {
  await sendTradeOfferMessages(await claimTradeOfferStatusMessages(orgId));
}

async function sendCreatedReservationMessage(orgId: string, userId: string, requestGuid: string) {
  const rows = await db.execute<ReservationMessageRow>(sql`
    WITH messaged AS (
      SELECT reservation.*, discord_link.discord_user_id
      FROM card_reservations reservation
      JOIN customer_status_messages settings ON settings.user_id = reservation.guest_user_id
      JOIN discord_user_links discord_link ON discord_link.user_id = reservation.guest_user_id
      WHERE reservation.org_id = ${orgId}
        AND reservation.request_guid = ${requestGuid}
        AND reservation.guest_user_id = ${userId}
        AND settings.card_reservations_enabled_at IS NOT NULL
        AND discord_link.discord_user_id IS NOT NULL
        AND discord_link.linked_at IS NOT NULL
    )
    SELECT ${RESERVATION_MESSAGE_COLUMNS}
    FROM messaged
    LEFT JOIN shop_catalogs catalog
      ON catalog.id = messaged.shop_catalog_id AND catalog.is_deleted = false
    ORDER BY messaged.id
  `);
  if (rows.rows.length === 0) return;
  await sendReservationMessages(
    toReservationMessages(rows.rows, "created", await queuePositionsOf(orgId)),
  );
}

async function sendCreatedTradeOfferMessage(userId: string, offerGuid: string) {
  const rows = await db.execute<TradeOfferMessageRow>(sql`
    WITH messaged AS (
      SELECT offer.*, discord_link.discord_user_id
      FROM trade_offers offer
      JOIN customer_status_messages settings ON settings.user_id = offer.guest_user_id
      JOIN discord_user_links discord_link ON discord_link.user_id = offer.guest_user_id
      WHERE offer.guid = ${offerGuid}
        AND offer.guest_user_id = ${userId}
        AND settings.trade_offers_enabled_at IS NOT NULL
        AND discord_link.discord_user_id IS NOT NULL
        AND discord_link.linked_at IS NOT NULL
    )
    SELECT ${TRADE_OFFER_MESSAGE_COLUMNS},
      extract(epoch FROM messaged.created_at)::float8 AS happened_at_epoch
    FROM messaged
    ${TRADE_OFFER_SENT_TO_JOINS}
  `);
  await sendTradeOfferMessages(rows.rows.map((row) => toTradeOfferMessage(row, "created")));
}

function logStatusMessageFailure(error: unknown) {
  console.error("[status-messages] Failed to send status messages:", error);
}

export function sendCreatedReservationStatusMessageInBackground(
  orgId: string,
  userId: string,
  requestGuid: string,
) {
  if (!isDiscordBotConfigured()) return;
  sendCreatedReservationMessage(orgId, userId, requestGuid).catch(logStatusMessageFailure);
}

export function sendCreatedTradeOfferStatusMessageInBackground(userId: string, offerGuid: string) {
  if (!isDiscordBotConfigured()) return;
  sendCreatedTradeOfferMessage(userId, offerGuid).catch(logStatusMessageFailure);
}

function runDispatch(orgId: string, kind: StatusMessageKind) {
  const key = `${orgId}\u0000${kind}`;
  scheduledDispatches.delete(key);
  if (runningDispatches.has(key)) {
    dispatchesToRerun.add(key);
    return;
  }
  runningDispatches.add(key);
  const dispatch =
    kind === "tradeOffers" ? sendTradeOfferStatusMessages(orgId) : sendReservationStatusMessages(orgId);
  dispatch
    .catch(logStatusMessageFailure)
    .finally(() => {
      runningDispatches.delete(key);
      if (dispatchesToRerun.delete(key)) scheduleCustomerStatusMessages(orgId, kind);
    });
}

export function scheduleCustomerStatusMessages(orgId: string, kind: StatusMessageKind) {
  if (!isDiscordBotConfigured()) return;
  const key = `${orgId}\u0000${kind}`;
  if (scheduledDispatches.has(key)) return;
  scheduledDispatches.set(
    key,
    setTimeout(() => runDispatch(orgId, kind), CUSTOMER_STATUS_MESSAGES_DELAY_MS),
  );
}
