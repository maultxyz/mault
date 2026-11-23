import type {
  CardReservationCard,
  CardReservationGuestAlert,
  StatusMessageKind,
  StatusMessageSettings,
  StatusMessageSettingsUpdate,
  TradeOfferStatus,
} from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
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
import type {
  ClaimedReservationStatusMessage,
  ClaimedTradeOfferStatusMessage,
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

async function claimReservationStatusMessages(
  orgId: string,
): Promise<ClaimedReservationStatusMessage[]> {
  const claimed = await db.execute<{
    discord_user_id: string;
    catalog_name: string | null;
    card: CardReservationCard;
    guest_alert: CardReservationGuestAlert;
    hold_expires_at_epoch: number | null;
  }>(sql`
    WITH claimed AS (
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
      RETURNING reservation.id, reservation.shop_catalog_id, reservation.card,
        reservation.guest_alert, reservation.hold_expires_at, discord_link.discord_user_id
    )
    SELECT claimed.discord_user_id, catalog.name AS catalog_name, claimed.card,
      claimed.guest_alert, extract(epoch FROM claimed.hold_expires_at)::float8 AS hold_expires_at_epoch
    FROM claimed
    LEFT JOIN shop_catalogs catalog
      ON catalog.id = claimed.shop_catalog_id AND catalog.is_deleted = false
    ORDER BY claimed.id
  `);
  return claimed.rows.map((row) => ({
    discordUserId: row.discord_user_id,
    catalogName: row.catalog_name,
    card: row.card,
    guestAlert: row.guest_alert,
    holdExpiresAt:
      row.hold_expires_at_epoch === null ? null : new Date(Number(row.hold_expires_at_epoch) * 1000),
  }));
}

async function claimTradeOfferStatusMessages(
  orgId: string,
): Promise<ClaimedTradeOfferStatusMessage[]> {
  const claimed = await db.execute<{
    discord_user_id: string;
    status: TradeOfferStatus;
    sent_to_name: string | null;
    wanted_count: number;
    responded_at_epoch: number;
  }>(sql`
    WITH claimed AS (
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
      RETURNING offer.id, offer.status, offer.collection_id, offer.storage_location_id,
        offer.wanted_cards, offer.responded_at, offer.org_id, discord_link.discord_user_id
    )
    SELECT claimed.discord_user_id, claimed.status,
      COALESCE(collection.name, location.name) AS sent_to_name,
      COALESCE(jsonb_array_length(claimed.wanted_cards), 0)::int AS wanted_count,
      extract(epoch FROM claimed.responded_at)::float8 AS responded_at_epoch
    FROM claimed
    LEFT JOIN collections collection
      ON collection.id = claimed.collection_id AND collection.org_id = claimed.org_id
        AND collection.is_deleted = false
    LEFT JOIN storage_locations location
      ON location.id = claimed.storage_location_id AND location.org_id = claimed.org_id
        AND location.is_deleted = false
    ORDER BY claimed.id
  `);
  return claimed.rows.map((row) => ({
    discordUserId: row.discord_user_id,
    status: row.status,
    sentToName: row.sent_to_name,
    wantedCount: Number(row.wanted_count),
    respondedAt: new Date(Number(row.responded_at_epoch) * 1000),
  }));
}

async function sendReservationStatusMessages(orgId: string) {
  const messages = await claimReservationStatusMessages(orgId);
  const byRecipientAndCatalog = new Map<string, ClaimedReservationStatusMessage[]>();
  for (const message of messages) {
    const key = `${message.discordUserId}\u0000${message.catalogName ?? ""}`;
    byRecipientAndCatalog.set(key, [...(byRecipientAndCatalog.get(key) ?? []), message]);
  }
  const now = new Date();
  for (const group of byRecipientAndCatalog.values()) {
    await sendDiscordDirectMessage(group[0].discordUserId, reservationStatusEmbed(group, getWebUrl(), now));
  }
}

async function sendTradeOfferStatusMessages(orgId: string) {
  for (const message of await claimTradeOfferStatusMessages(orgId)) {
    await sendDiscordDirectMessage(message.discordUserId, tradeOfferStatusEmbed(message, getWebUrl()));
  }
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
    .catch((error) => console.error("[status-messages] Failed to send status messages:", error))
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
