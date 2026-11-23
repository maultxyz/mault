import {
  CARD_RESERVATION_ACTIVE_STATUSES,
  CARD_RESERVATIONS_CHANGED_EVENT,
  MY_CARD_RESERVATIONS_CHANGED_EVENT,
  MY_TRADE_OFFERS_CHANGED_EVENT,
  TRADE_OFFERS_CHANGED_EVENT,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { cardReservations, tradeOffers } from "../db/schema";
import { cardReservationQueuesByCard } from "./card-reservation-settlement";
import { loadActiveCardReservationRows, toPublicCardReservation } from "./card-reservations";
import { CUSTOMER_ITEMS_CHANGED_THROTTLE_MS } from "./constants/timing";
import { scheduleCustomerStatusMessages } from "./customer-status-messages";
import type { CustomerItemKind, CustomerStreamSubscriber } from "./interfaces/customer-stream";
import type { SseWriter } from "./interfaces/sse";

const CUSTOMER_ITEM_KIND_BY_ORG_EVENT = new Map<string, CustomerItemKind>([
  [TRADE_OFFERS_CHANGED_EVENT, "tradeOffers"],
  [CARD_RESERVATIONS_CHANGED_EVENT, "cardReservations"],
]);

const CUSTOMER_EVENT_BY_KIND: Record<CustomerItemKind, string> = {
  tradeOffers: MY_TRADE_OFFERS_CHANGED_EVENT,
  cardReservations: MY_CARD_RESERVATIONS_CHANGED_EVENT,
};

const CUSTOMER_ITEM_KINDS = Object.keys(CUSTOMER_EVENT_BY_KIND) as CustomerItemKind[];

const subscribersByUserId = new Map<string, Set<CustomerStreamSubscriber>>();
const subscribersByOrgId = new Map<string, Set<CustomerStreamSubscriber>>();
const fingerprintsByUserOrgKind = new Map<string, string>();
const scheduledOrgChecks = new Map<string, ReturnType<typeof setTimeout>>();
const runningOrgChecks = new Set<string>();
const orgChecksToRerun = new Set<string>();

function fingerprintKey(userId: string, orgId: string, kind: CustomerItemKind): string {
  return `${userId}\u0000${orgId}\u0000${kind}`;
}

function orgCheckKey(orgId: string, kind: CustomerItemKind): string {
  return `${orgId}\u0000${kind}`;
}

async function loadCustomerOrgIds(userId: string): Promise<string[]> {
  const reservationOrgs = await db
    .selectDistinct({ orgId: cardReservations.orgId })
    .from(cardReservations)
    .where(
      and(
        eq(cardReservations.guestUserId, userId),
        inArray(cardReservations.status, [...CARD_RESERVATION_ACTIVE_STATUSES]),
      ),
    );
  const tradeOfferOrgs = await db
    .selectDistinct({ orgId: tradeOffers.orgId })
    .from(tradeOffers)
    .where(and(eq(tradeOffers.guestUserId, userId), eq(tradeOffers.status, "pending")));
  return [...reservationOrgs, ...tradeOfferOrgs].map((row) => row.orgId);
}

async function loadTradeOfferFingerprints(
  orgId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const rows = await db
    .select({
      guestUserId: tradeOffers.guestUserId,
      guid: tradeOffers.guid,
      status: tradeOffers.status,
      respondedAt: tradeOffers.respondedAt,
    })
    .from(tradeOffers)
    .where(and(eq(tradeOffers.orgId, orgId), inArray(tradeOffers.guestUserId, userIds)));
  const statesByUser = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.guestUserId) continue;
    const states = statesByUser.get(row.guestUserId) ?? [];
    states.push(JSON.stringify([row.guid, row.status, row.respondedAt?.toISOString() ?? null]));
    statesByUser.set(row.guestUserId, states);
  }
  return new Map(userIds.map((userId) => [userId, (statesByUser.get(userId) ?? []).sort().join("\n")]));
}

async function loadCardReservationFingerprints(
  orgId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const { queues, rows } = await db.transaction(async (tx) => ({
    queues: cardReservationQueuesByCard(await loadActiveCardReservationRows(tx, orgId)),
    rows: await tx
      .select()
      .from(cardReservations)
      .where(and(eq(cardReservations.orgId, orgId), inArray(cardReservations.guestUserId, userIds))),
  }));
  const statesByUser = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.guestUserId) continue;
    const seen = toPublicCardReservation(row, null, queues.get(row.collectionCardId) ?? []);
    const states = statesByUser.get(row.guestUserId) ?? [];
    states.push(
      JSON.stringify([
        seen.guid,
        seen.status,
        seen.queuePosition,
        seen.holdExpiresAt,
        seen.isReadyForPickup,
        seen.closedAt,
        row.guestAlert,
      ]),
    );
    statesByUser.set(row.guestUserId, states);
  }
  return new Map(userIds.map((userId) => [userId, (statesByUser.get(userId) ?? []).sort().join("\n")]));
}

function loadFingerprints(
  kind: CustomerItemKind,
  orgId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  return kind === "tradeOffers"
    ? loadTradeOfferFingerprints(orgId, userIds)
    : loadCardReservationFingerprints(orgId, userIds);
}

async function rememberFingerprints(userId: string, orgId: string) {
  for (const kind of CUSTOMER_ITEM_KINDS) {
    const fingerprints = await loadFingerprints(kind, orgId, [userId]);
    const key = fingerprintKey(userId, orgId, kind);
    if (!fingerprintsByUserOrgKind.has(key) && subscribersByUserId.has(userId)) {
      fingerprintsByUserOrgKind.set(key, fingerprints.get(userId) ?? "");
    }
  }
}

function watchOrgForSubscriber(subscriber: CustomerStreamSubscriber, orgId: string): boolean {
  if (subscriber.orgIds.has(orgId)) return false;
  subscriber.orgIds.add(orgId);
  let subscribers = subscribersByOrgId.get(orgId);
  if (!subscribers) {
    subscribers = new Set();
    subscribersByOrgId.set(orgId, subscribers);
  }
  subscribers.add(subscriber);
  return true;
}

async function watchOrgsForUser(userId: string, orgIds: Iterable<string>) {
  for (const orgId of orgIds) {
    let isNewForUser = false;
    for (const subscriber of subscribersByUserId.get(userId) ?? []) {
      if (watchOrgForSubscriber(subscriber, orgId)) isNewForUser = true;
    }
    if (isNewForUser) await rememberFingerprints(userId, orgId);
  }
}

function forgetUser(userId: string, orgIds: Iterable<string>) {
  for (const orgId of orgIds) {
    for (const kind of CUSTOMER_ITEM_KINDS) {
      fingerprintsByUserOrgKind.delete(fingerprintKey(userId, orgId, kind));
    }
  }
}

export async function subscribeCustomerEvents(
  userId: string,
  write: SseWriter,
): Promise<() => void> {
  const subscriber: CustomerStreamSubscriber = { userId, orgIds: new Set(), write };
  let userSubscribers = subscribersByUserId.get(userId);
  if (!userSubscribers) {
    userSubscribers = new Set();
    subscribersByUserId.set(userId, userSubscribers);
  }
  userSubscribers.add(subscriber);

  const unsubscribe = () => {
    const subscribersOfUser = subscribersByUserId.get(userId);
    subscribersOfUser?.delete(subscriber);
    if (subscribersOfUser?.size === 0) {
      subscribersByUserId.delete(userId);
      forgetUser(userId, subscriber.orgIds);
    }
    for (const orgId of subscriber.orgIds) {
      const subscribersOfOrg = subscribersByOrgId.get(orgId);
      subscribersOfOrg?.delete(subscriber);
      if (subscribersOfOrg?.size === 0) subscribersByOrgId.delete(orgId);
    }
  };

  try {
    const orgIds = await loadCustomerOrgIds(userId);
    for (const otherSubscriber of userSubscribers) {
      for (const orgId of otherSubscriber.orgIds) watchOrgForSubscriber(subscriber, orgId);
    }
    await watchOrgsForUser(userId, orgIds);
  } catch (error) {
    unsubscribe();
    throw error;
  }
  return unsubscribe;
}

function logCustomerWatchFailure(error: unknown) {
  console.error("[customer-stream] Failed to watch customer items:", error);
}

export function watchCustomerOrgInBackground(userId: string, orgId: string) {
  if (!subscribersByUserId.has(userId)) return;
  watchOrgsForUser(userId, [orgId]).catch(logCustomerWatchFailure);
}

export function refreshCustomerOrgsInBackground(userId: string) {
  if (!subscribersByUserId.has(userId)) return;
  loadCustomerOrgIds(userId)
    .then((orgIds) => watchOrgsForUser(userId, orgIds))
    .catch(logCustomerWatchFailure);
}

async function checkOrgForCustomerChanges(orgId: string, kind: CustomerItemKind) {
  const subscribers = subscribersByOrgId.get(orgId);
  if (!subscribers?.size) return;
  const userIds = [...new Set([...subscribers].map((subscriber) => subscriber.userId))];
  const fingerprints = await loadFingerprints(kind, orgId, userIds);
  for (const userId of userIds) {
    const key = fingerprintKey(userId, orgId, kind);
    const previous = fingerprintsByUserOrgKind.get(key);
    const next = fingerprints.get(userId) ?? "";
    if (!subscribersByUserId.has(userId)) continue;
    fingerprintsByUserOrgKind.set(key, next);
    if (previous === undefined || previous === next) continue;
    for (const subscriber of subscribersByUserId.get(userId) ?? []) {
      if (!subscriber.orgIds.has(orgId)) continue;
      try {
        subscriber.write(CUSTOMER_EVENT_BY_KIND[kind], {});
      } catch {}
    }
  }
}

function runOrgCheck(orgId: string, kind: CustomerItemKind) {
  const key = orgCheckKey(orgId, kind);
  scheduledOrgChecks.delete(key);
  if (runningOrgChecks.has(key)) {
    orgChecksToRerun.add(key);
    return;
  }
  runningOrgChecks.add(key);
  checkOrgForCustomerChanges(orgId, kind)
    .catch((error) => console.error("[customer-stream] Failed to check customer items:", error))
    .finally(() => {
      runningOrgChecks.delete(key);
      if (orgChecksToRerun.delete(key)) scheduleOrgCheck(orgId, kind);
    });
}

function scheduleOrgCheck(orgId: string, kind: CustomerItemKind) {
  const key = orgCheckKey(orgId, kind);
  if (scheduledOrgChecks.has(key)) return;
  scheduledOrgChecks.set(
    key,
    setTimeout(() => runOrgCheck(orgId, kind), CUSTOMER_ITEMS_CHANGED_THROTTLE_MS),
  );
}

export function notifyCustomersOfOrgEvent(orgId: string, orgEvent: string) {
  const kind = CUSTOMER_ITEM_KIND_BY_ORG_EVENT.get(orgEvent);
  if (!kind) return;
  scheduleCustomerStatusMessages(orgId, kind);
  if (!subscribersByOrgId.get(orgId)?.size) return;
  scheduleOrgCheck(orgId, kind);
}
