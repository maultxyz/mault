import {
  CARD_RESERVATION_ACTIVE_STATUSES,
  CARD_RESERVATION_CLOSED_STATUSES,
  CARD_RESERVATION_QUEUE_MAX,
  CARD_RESERVATIONS_ACTIVE_PER_GUEST_MAX,
  CARD_RESERVATIONS_CLOSED_LIST_MAX,
  PRICE_SOURCE_FIELDS,
  cardReservationHoldExpiry,
  cardReservationQueuePositions,
  isActiveCardReservationStatus,
  toCardCondition,
  tradeOfferCardImageUrl,
  type CardReservation,
  type CardReservationCard,
  type CardReservationListView,
  type CardReservationStatus,
  type CreatedCardReservationPick,
  type OrderLine,
  type PublicCardReservation,
  type PublicCardReservations,
} from "@magic-vault/shared";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  cardReservations,
  cardSales,
  collectionCards,
  fulfilmentOrders,
  shopCatalogs,
} from "../db/schema";
import { loadStoredCardsByRowIds, toStoredCards } from "../routes/storage-locations/shared";
import { logActivity } from "./activity-log";
import { containsLikePattern } from "./business-list-search";
import {
  CARD_RESERVATION_GUEST_ALERT_BY_STATUS,
  CARD_RESERVATIONS_GUEST_LIST_MAX,
  CARD_RESERVATIONS_LOCK_PREFIX,
  CARD_RESERVATIONS_PER_ORG_HOURLY_MAX,
  CARD_RESERVATIONS_PER_ORG_WINDOW_MS,
} from "./constants/card-reservations";
import type {
  ActiveCardReservationRow,
  CancelGuestCardReservationInput,
  CardReservationRow,
  CardReservationSelection,
  CloseCardReservationsInput,
  CollectCardReservationsResult,
  CreateCardReservationPickInput,
  CreateCardReservationsInput,
  CreateCardReservationsResult,
} from "./interfaces/card-reservations";
import {
  cardReservationQueuesByCard,
  cardReservationSettlementHasChanges,
  planCardReservationSettlement,
} from "./card-reservation-settlement";
import type { SoldCardRow } from "./interfaces/business";
import type { ShopCatalogClaims } from "./interfaces/share-tokens";
import { loadOrgPricing } from "./price-source";
import { loadCardSellPrices } from "./card-pricing";
import { findPublicCardRowIds } from "./public-card-browse";
import { integerArraySql, uuidArraySql } from "./sql-arrays";
import { loadCurrentWantedCards, storedCardPrice } from "./trade-offers";

const ACTIVE_STATUSES = [...CARD_RESERVATION_ACTIVE_STATUSES];

function isActiveReservation(orgId: string) {
  return and(eq(cardReservations.orgId, orgId), inArray(cardReservations.status, ACTIVE_STATUSES));
}

async function lockCardReservations(tx: Transaction, orgId: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`${CARD_RESERVATIONS_LOCK_PREFIX}${orgId}`}))`,
  );
}

export async function loadActiveCardReservationRows(tx: Transaction, orgId: string): Promise<ActiveCardReservationRow[]> {
  const rows = await tx
    .select({
      id: cardReservations.id,
      collectionCardId: cardReservations.collectionCardId,
      guestKeyHash: cardReservations.guestKeyHash,
      status: cardReservations.status,
      holdDays: cardReservations.holdDays,
      holdExpiresAt: cardReservations.holdExpiresAt,
      cardExists: sql<boolean>`EXISTS (
        SELECT 1 FROM collection_cards reserved_card
        WHERE reserved_card.id = card_reservations.collection_card_id
      )`,
    })
    .from(cardReservations)
    .where(isActiveReservation(orgId))
    .orderBy(asc(cardReservations.createdAt), asc(cardReservations.id));
  return rows as ActiveCardReservationRow[];
}

function guestAlertFor(status: CardReservationStatus, changedAt: Date) {
  const guestAlert = CARD_RESERVATION_GUEST_ALERT_BY_STATUS[status] ?? null;
  return { guestAlert, guestAlertAt: guestAlert ? changedAt : null };
}

async function closeReservations(
  tx: Transaction,
  ids: number[],
  status: CardReservationStatus,
  closedAt: Date,
): Promise<void> {
  if (ids.length === 0) return;
  await tx
    .update(cardReservations)
    .set({ status, closedAt, ...guestAlertFor(status, closedAt) })
    .where(inArray(cardReservations.id, ids));
}

async function settleWhileLocked(tx: Transaction, orgId: string, now: Date): Promise<boolean> {
  const plan = planCardReservationSettlement(await loadActiveCardReservationRows(tx, orgId), now);
  await closeReservations(tx, plan.unavailableIds, "unavailable", now);
  await closeReservations(tx, plan.expiredIds, "expired", now);
  for (const promotion of plan.promotions) {
    await tx
      .update(cardReservations)
      .set({
        status: "ready",
        holdStartedAt: promotion.holdStartedAt,
        holdExpiresAt: promotion.holdExpiresAt,
        guestAlert: "held",
        guestAlertAt: now,
      })
      .where(eq(cardReservations.id, promotion.id));
  }
  return cardReservationSettlementHasChanges(plan);
}

export async function settleCardReservations(tx: Transaction, orgId: string): Promise<boolean> {
  const now = new Date();
  if (!cardReservationSettlementHasChanges(planCardReservationSettlement(await loadActiveCardReservationRows(tx, orgId), now))) {
    return false;
  }
  await lockCardReservations(tx, orgId);
  return settleWhileLocked(tx, orgId, now);
}

async function loadReservationCards(
  tx: Transaction,
  collectionCardIds: number[],
): Promise<Map<number, CardReservationCard>> {
  const rows = await loadStoredCardsByRowIds(tx, collectionCardIds);
  const stored = await toStoredCards(rows, false);
  return new Map(
    rows.map((row, index) => [
      row.rowId,
      {
        gameKey: row.gameKey,
        name: stored[index].card.name,
        setCode: stored[index].card.set,
        setName: stored[index].card.setName,
        collectorNumber: stored[index].card.collectorNumber,
        imageUrl: tradeOfferCardImageUrl(stored[index].card),
        condition: stored[index].condition,
        isFoil: stored[index].isFoil,
        foilType: stored[index].foilType,
      },
    ]),
  );
}

export async function createCardReservations(
  tx: Transaction,
  input: CreateCardReservationsInput,
): Promise<CreateCardReservationsResult> {
  const { catalog, request } = input;
  const orgId = catalog.orgId;
  const scanIds = [...new Set(request.scanIds)];
  await lockCardReservations(tx, orgId);
  const now = new Date();
  await settleWhileLocked(tx, orgId, now);
  const rowIdByScanId = await findPublicCardRowIds(tx, input.scope, scanIds);
  if (rowIdByScanId.size !== scanIds.length) return { status: "card-not-found" };
  const activeRows = await loadActiveCardReservationRows(tx, orgId);
  const queues = cardReservationQueuesByCard(activeRows);
  const requestedRowIds = scanIds.map((scanId) => rowIdByScanId.get(scanId) ?? 0);
  const requestedQueues = requestedRowIds.map((rowId) => queues.get(rowId) ?? []);
  if (requestedQueues.some((queue) => queue.some((row) => row.guestKeyHash === input.guestKeyHash))) {
    return { status: "already-reserved" };
  }
  if (requestedQueues.some((queue) => queue.length >= CARD_RESERVATION_QUEUE_MAX)) {
    return { status: "queue-full" };
  }
  const guestActiveCount = activeRows.filter(
    (row) => row.guestKeyHash === input.guestKeyHash,
  ).length;
  if (guestActiveCount + scanIds.length > CARD_RESERVATIONS_ACTIVE_PER_GUEST_MAX) {
    return { status: "guest-limit-reached" };
  }
  const [recentForOrg] = await tx
    .select({ total: count() })
    .from(cardReservations)
    .where(
      and(
        eq(cardReservations.orgId, orgId),
        gt(
          cardReservations.createdAt,
          new Date(now.getTime() - CARD_RESERVATIONS_PER_ORG_WINDOW_MS),
        ),
      ),
    );
  if ((recentForOrg?.total ?? 0) + scanIds.length > CARD_RESERVATIONS_PER_ORG_HOURLY_MAX) {
    return { status: "guest-limit-reached" };
  }
  const cards = await loadReservationCards(tx, requestedRowIds);
  if (cards.size !== requestedRowIds.length) return { status: "card-not-found" };
  const pricing = await loadOrgPricing(tx, orgId);
  const priceCurrency = PRICE_SOURCE_FIELDS[pricing.source].currency;
  const sellPrices = await loadCardSellPrices(tx, orgId, scanIds, pricing);
  const holdExpiresAt = cardReservationHoldExpiry(now, catalog.reservationHoldDays);
  const requestGuid = randomUUID();
  const values = requestedRowIds.map((collectionCardId, index) => {
    const holdsCard = requestedQueues[index].length === 0;
    return {
      orgId,
      shopCatalogId: catalog.catalogId,
      requestGuid,
      collectionCardId,
      card: cards.get(collectionCardId),
      guestName: request.guestName,
      guestContact: request.guestContact,
      guestNote: request.guestNote || null,
      guestKeyHash: input.guestKeyHash,
      guestUserId: input.guestUserId,
      status: holdsCard ? "ready" : "waiting",
      holdDays: catalog.reservationHoldDays,
      holdStartedAt: holdsCard ? now : null,
      holdExpiresAt: holdsCard ? holdExpiresAt : null,
      priceAtReservation: sellPrices.get(scanIds[index]) ?? null,
      priceCurrency,
    };
  });
  await tx.insert(cardReservations).values(values);
  const heldCount = values.filter((value) => value.status === "ready").length;
  return {
    status: "created",
    created: { heldCount, waitingCount: values.length - heldCount },
    changed: {
      createdReservation: {
        guestName: request.guestName,
        cardNames: requestedRowIds.map((rowId) => cards.get(rowId)?.name ?? ""),
        heldCount,
      },
    },
  };
}

export function toPublicCardReservation(
  row: CardReservationRow,
  scanId: string | null,
  queue: ActiveCardReservationRow[],
): PublicCardReservation {
  const status = row.status as CardReservationStatus;
  const isActive = isActiveCardReservationStatus(status);
  return {
    guid: row.guid,
    requestGuid: row.requestGuid,
    scanId: isActive ? scanId : null,
    card: row.card as CardReservationCard,
    status,
    queuePosition: isActive ? (cardReservationQueuePositions(queue).get(row.id) ?? null) : null,
    queueLength: isActive ? queue.length : 0,
    holdExpiresAt: status === "ready" ? (row.holdExpiresAt?.toISOString() ?? null) : null,
    isReadyForPickup: status === "ready" && row.pulledAt !== null,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
  };
}

export async function listPublicCardReservations(
  tx: Transaction,
  catalog: ShopCatalogClaims,
  guestKeyHash: string | null,
): Promise<PublicCardReservations> {
  await settleCardReservations(tx, catalog.orgId);
  const queues = cardReservationQueuesByCard(await loadActiveCardReservationRows(tx, catalog.orgId));
  const reservedCardRows =
    queues.size === 0
      ? []
      : await tx
          .select({ id: collectionCards.id, scanId: collectionCards.guid })
          .from(collectionCards)
          .where(
            and(
              eq(collectionCards.orgId, catalog.orgId),
              inArray(collectionCards.id, [...queues.keys()]),
              sql`(${collectionCards.collectionId} = ANY(${integerArraySql(catalog.collectionIds)})
                OR ${collectionCards.locationId} = ANY(${integerArraySql(catalog.storageLocationIds)}))`,
            ),
          );
  const mineRows = guestKeyHash
    ? await tx
        .select({ reservation: cardReservations, scanId: collectionCards.guid })
        .from(cardReservations)
        .leftJoin(collectionCards, eq(collectionCards.id, cardReservations.collectionCardId))
        .where(
          and(
            eq(cardReservations.orgId, catalog.orgId),
            eq(cardReservations.shopCatalogId, catalog.catalogId),
            eq(cardReservations.guestKeyHash, guestKeyHash),
          ),
        )
        .orderBy(desc(cardReservations.createdAt), desc(cardReservations.id))
        .limit(CARD_RESERVATIONS_GUEST_LIST_MAX)
    : [];
  return {
    reservedCards: reservedCardRows.flatMap((row) =>
      row.scanId
        ? [{ scanId: row.scanId, queueLength: queues.get(row.id)?.length ?? 0 }]
        : [],
    ),
    mine: mineRows.map((row) =>
      toPublicCardReservation(
        row.reservation,
        row.scanId,
        queues.get(row.reservation.collectionCardId) ?? [],
      ),
    ),
  };
}

export async function cancelGuestCardReservation(
  tx: Transaction,
  input: CancelGuestCardReservationInput,
): Promise<boolean> {
  await lockCardReservations(tx, input.orgId);
  const now = new Date();
  const cancelled = await tx
    .update(cardReservations)
    .set({ status: "cancelled", closedAt: now, guestAlert: null, guestAlertAt: null })
    .where(
      and(
        isActiveReservation(input.orgId),
        selectedReservationSql(input.selection),
        eq(cardReservations.guestKeyHash, input.guestKeyHash),
      ),
    )
    .returning({ id: cardReservations.id });
  if (cancelled.length === 0) return false;
  await settleWhileLocked(tx, input.orgId, now);
  return true;
}

function matchingRequestSql(orgId: string, search: string | null) {
  if (!search) return undefined;
  const pattern = containsLikePattern(search);
  return sql`${cardReservations.requestGuid} IN (
    SELECT matched.request_guid
    FROM card_reservations matched
    LEFT JOIN shop_catalogs matched_catalog ON matched_catalog.id = matched.shop_catalog_id
    WHERE matched.org_id = ${orgId}
      AND (
        matched.guest_name ILIKE ${pattern}
        OR matched.guest_contact ILIKE ${pattern}
        OR matched.guest_note ILIKE ${pattern}
        OR matched.card ->> 'name' ILIKE ${pattern}
        OR matched_catalog.name ILIKE ${pattern}
      )
  )`;
}

export async function listOwnerCardReservations(
  tx: Transaction,
  orgId: string,
  view: CardReservationListView,
  search: string | null = null,
): Promise<CardReservation[]> {
  await settleCardReservations(tx, orgId);
  const selectRows = () =>
    tx
      .select({
        reservation: cardReservations,
        scanId: collectionCards.guid,
        catalogName: shopCatalogs.name,
        pickOrderGuid: fulfilmentOrders.guid,
        pickOrderName: fulfilmentOrders.name,
      })
      .from(cardReservations)
      .leftJoin(collectionCards, eq(collectionCards.id, cardReservations.collectionCardId))
      .leftJoin(
        fulfilmentOrders,
        and(
          eq(fulfilmentOrders.id, cardReservations.fulfilmentOrderId),
          eq(fulfilmentOrders.status, "open"),
          eq(fulfilmentOrders.isDeleted, false),
        ),
      )
      .leftJoin(
        shopCatalogs,
        and(
          eq(shopCatalogs.id, cardReservations.shopCatalogId),
          eq(shopCatalogs.isDeleted, false),
        ),
      );
  const rows =
    view === "active"
      ? await selectRows()
          .where(and(isActiveReservation(orgId), matchingRequestSql(orgId, search)))
          .orderBy(asc(cardReservations.createdAt), asc(cardReservations.id))
      : await selectRows()
          .where(
            and(
              eq(cardReservations.orgId, orgId),
              inArray(cardReservations.status, [...CARD_RESERVATION_CLOSED_STATUSES]),
              matchingRequestSql(orgId, search),
            ),
          )
          .orderBy(desc(cardReservations.closedAt), desc(cardReservations.id))
          .limit(CARD_RESERVATIONS_CLOSED_LIST_MAX);
  const queues =
    view === "active"
      ? cardReservationQueuesByCard(await loadActiveCardReservationRows(tx, orgId))
      : new Map<number, ActiveCardReservationRow[]>();
  const pricing = await loadOrgPricing(tx, orgId);
  const { cardsByScanId, placementsByScanId } = await loadCurrentWantedCards(
    tx,
    orgId,
    view === "active" ? rows.flatMap((row) => (row.scanId ? [row.scanId] : [])) : [],
  );
  return rows.map((row) => {
    const publicReservation = toPublicCardReservation(
      row.reservation,
      row.scanId,
      queues.get(row.reservation.collectionCardId) ?? [],
    );
    const current = publicReservation.scanId
      ? cardsByScanId.get(publicReservation.scanId)
      : undefined;
    return {
      ...publicReservation,
      guestName: row.reservation.guestName,
      guestContact: row.reservation.guestContact,
      guestNote: row.reservation.guestNote,
      catalogName: row.catalogName ?? null,
      price:
        row.reservation.priceAtReservation != null &&
        row.reservation.priceCurrency === PRICE_SOURCE_FIELDS[pricing.source].currency
          ? row.reservation.priceAtReservation
          : current
            ? storedCardPrice(current, pricing)
            : null,
      priceSource: pricing.source,
      placement: publicReservation.scanId
        ? (placementsByScanId.get(publicReservation.scanId) ?? null)
        : null,
      pickOrderGuid: publicReservation.status === "ready" ? (row.pickOrderGuid ?? null) : null,
      pickOrderName: publicReservation.status === "ready" ? (row.pickOrderName ?? null) : null,
    };
  });
}

function selectedReservationSql(selection: CardReservationSelection) {
  return selection.kind === "reservation"
    ? eq(cardReservations.guid, selection.reservationGuid)
    : eq(cardReservations.requestGuid, selection.requestGuid);
}

async function findActiveReservations(
  tx: Transaction,
  orgId: string,
  selection: CardReservationSelection,
) {
  return tx
    .select()
    .from(cardReservations)
    .where(and(isActiveReservation(orgId), selectedReservationSql(selection)))
    .orderBy(asc(cardReservations.createdAt), asc(cardReservations.id));
}

export async function releaseCardReservations(
  tx: Transaction,
  input: CloseCardReservationsInput,
): Promise<number> {
  await lockCardReservations(tx, input.orgId);
  const now = new Date();
  const reservations = await findActiveReservations(tx, input.orgId, input.selection);
  if (reservations.length === 0) return 0;
  await tx
    .update(cardReservations)
    .set({
      status: "released",
      closedAt: now,
      closedByUserId: input.userId,
      ...guestAlertFor("released", now),
    })
    .where(inArray(cardReservations.id, reservations.map((reservation) => reservation.id)));
  await settleWhileLocked(tx, input.orgId, now);
  await logActivity(tx, {
    orgId: input.orgId,
    userId: input.userId,
    action: "reservation.released",
    summary: reservations[0].guestName,
    details: {
      requestGuid: reservations[0].requestGuid,
      count: reservations.length,
      cardNames: reservations.map((reservation) => (reservation.card as CardReservationCard).name),
    },
  });
  return reservations.length;
}

export async function collectCardReservations(
  tx: Transaction,
  input: CloseCardReservationsInput,
): Promise<CollectCardReservationsResult> {
  const { orgId } = input;
  await lockCardReservations(tx, orgId);
  const now = new Date();
  await settleWhileLocked(tx, orgId, now);
  const reservations = await findActiveReservations(tx, orgId, input.selection);
  if (reservations.length === 0) return { status: "not-found" };
  const held = reservations.filter((reservation) => reservation.status === "ready");
  if (held.length === 0) return { status: "not-holder" };
  const heldRowIds = held.map((reservation) => reservation.collectionCardId);
  const pricing = await loadOrgPricing(tx, orgId);
  const currency = PRICE_SOURCE_FIELDS[pricing.source].currency;
  const storedRows = await loadStoredCardsByRowIds(tx, heldRowIds);
  const stored = await toStoredCards(storedRows, false);
  const reservedPriceByRowId = new Map(
    held.map((reservation) => [
      reservation.collectionCardId,
      reservation.priceAtReservation != null && reservation.priceCurrency === currency
        ? reservation.priceAtReservation
        : null,
    ]),
  );
  const salePriceByRowId = new Map(
    storedRows.map((row, index) => [
      row.rowId,
      reservedPriceByRowId.get(row.rowId) ?? storedCardPrice(stored[index], pricing),
    ]),
  );
  const sold = (
    await tx.execute(sql`
      DELETE FROM collection_cards cc
      USING collections col
      WHERE col.id = cc.collection_id
        AND cc.org_id = ${orgId}
        AND cc.id = ANY(${integerArraySql(heldRowIds)})
      RETURNING cc.id AS row_id, cc.guid::text AS scan_id, cc.card_id,
        cc.card_name AS name,
        cc.card_set AS set_code,
        cc.card_collector_number AS collector_number,
        cc.is_foil, cc.condition, cc.acquisition_cost, cc.intake_lot_id,
        cc.acquisition_currency, cc.captured_image_key AS image_key,
        cc.captured_back_image_key AS back_image_key,
        col.guid::text AS collection_guid, col.name AS collection_name
    `)
  ).rows as unknown as (SoldCardRow & { row_id: number | string })[];
  if (sold.length === 0) return { status: "card-gone" };
  const salePriceOf = (card: (typeof sold)[number]) =>
    salePriceByRowId.get(Number(card.row_id)) ?? null;
  await tx.insert(cardSales).values(
    sold.map((card) => ({
      orgId,
      scanId: card.scan_id,
      cardId: card.card_id,
      cardName: card.name,
      setCode: card.set_code,
      collectorNumber: card.collector_number,
      isFoil: card.is_foil,
      condition: card.condition,
      salePrice: salePriceOf(card),
      acquisitionCost: card.acquisition_currency === currency ? card.acquisition_cost : null,
      intakeLotId: card.intake_lot_id,
      currency,
      collectionName: card.collection_name,
      soldByUserId: input.userId,
      soldAt: now,
    })),
  );
  const soldRowIds = new Set(sold.map((card) => Number(card.row_id)));
  const collectedIds = held
    .filter((reservation) => soldRowIds.has(reservation.collectionCardId))
    .map((reservation) => reservation.id);
  await tx
    .update(cardReservations)
    .set({
      status: "collected",
      closedAt: now,
      closedByUserId: input.userId,
      guestAlert: null,
      guestAlertAt: null,
    })
    .where(inArray(cardReservations.id, collectedIds));
  await tx
    .update(cardReservations)
    .set({ status: "unavailable", closedAt: now, ...guestAlertFor("unavailable", now) })
    .where(
      and(
        isActiveReservation(orgId),
        inArray(cardReservations.collectionCardId, heldRowIds),
      ),
    );
  await settleWhileLocked(tx, orgId, now);
  const saleTotal =
    Math.round(sold.reduce((sum, card) => sum + (salePriceOf(card) ?? 0), 0) * 100) / 100;
  await logActivity(tx, {
    orgId,
    userId: input.userId,
    action: "reservation.collected",
    summary: held[0].guestName,
    details: {
      requestGuid: held[0].requestGuid,
      count: sold.length,
      cardNames: sold.map((card) => card.name),
      saleTotal,
    },
  });
  return {
    status: "collected",
    collected: {
      collectedCount: sold.length,
      saleTotal,
      hasMissingPrices: sold.some((card) => salePriceOf(card) == null),
    },
    removedCards: sold.map((card) => ({ scanId: card.scan_id, collectionGuid: card.collection_guid })),
    imageKeys: sold.flatMap((card) => [card.image_key, card.back_image_key]),
  };
}

async function openPickOrderIds(tx: Transaction, orgId: string, orderIds: number[]): Promise<Set<number>> {
  if (orderIds.length === 0) return new Set();
  const rows = await tx
    .select({ id: fulfilmentOrders.id })
    .from(fulfilmentOrders)
    .where(
      and(
        eq(fulfilmentOrders.orgId, orgId),
        inArray(fulfilmentOrders.id, orderIds),
        eq(fulfilmentOrders.status, "open"),
        eq(fulfilmentOrders.isDeleted, false),
      ),
    );
  return new Set(rows.map((row) => row.id));
}

export async function createCardReservationPick(
  tx: Transaction,
  input: CreateCardReservationPickInput,
): Promise<CreatedCardReservationPick | null> {
  const { orgId } = input;
  await lockCardReservations(tx, orgId);
  await settleWhileLocked(tx, orgId, new Date());
  const held = await tx
    .select({
      id: cardReservations.id,
      guestName: cardReservations.guestName,
      fulfilmentOrderId: cardReservations.fulfilmentOrderId,
      scanId: collectionCards.guid,
      cardName: collectionCards.cardName,
      setCode: collectionCards.cardSet,
      setName: collectionCards.cardSetName,
      collectorNumber: collectionCards.cardCollectorNumber,
      condition: collectionCards.condition,
      isFoil: collectionCards.isFoil,
    })
    .from(cardReservations)
    .innerJoin(collectionCards, eq(collectionCards.id, cardReservations.collectionCardId))
    .where(
      and(
        eq(cardReservations.orgId, orgId),
        eq(cardReservations.requestGuid, input.requestGuid),
        eq(cardReservations.status, "ready"),
        isNull(cardReservations.pulledAt),
      ),
    )
    .orderBy(asc(cardReservations.createdAt), asc(cardReservations.id));
  const openOrderIds = await openPickOrderIds(
    tx,
    orgId,
    held.flatMap((row) => (row.fulfilmentOrderId === null ? [] : [row.fulfilmentOrderId])),
  );
  const toPull = held.filter(
    (row) =>
      row.scanId &&
      (row.fulfilmentOrderId === null || !openOrderIds.has(row.fulfilmentOrderId)),
  );
  if (toPull.length === 0) return null;
  const lines: OrderLine[] = toPull.map((row) => ({
    name: row.cardName ?? "",
    setCode: row.setCode,
    setName: row.setName,
    collectorNumber: row.collectorNumber,
    condition: toCardCondition(row.condition),
    isFoil: row.isFoil,
    quantity: 1,
    orderRef: row.guestName,
    allocations: [row.scanId ?? ""],
    picked: [],
  }));
  const [created] = await tx
    .insert(fulfilmentOrders)
    .values({ orgId, name: input.name, source: "generic", lines, createdByUserId: input.userId })
    .returning({ id: fulfilmentOrders.id, guid: fulfilmentOrders.guid });
  await tx
    .update(cardReservations)
    .set({ fulfilmentOrderId: created.id })
    .where(inArray(cardReservations.id, toPull.map((row) => row.id)));
  await logActivity(tx, {
    orgId,
    userId: input.userId,
    action: "order.created",
    summary: input.name,
    details: {
      orderGuid: created.guid,
      lines: lines.length,
      quantity: lines.length,
      reservationRequestGuid: input.requestGuid,
    },
  });
  return { orderGuid: created.guid ?? "", cardCount: lines.length };
}

export async function markReservedCardsReadyForPickup(
  tx: Transaction,
  orgId: string,
  scanIds: string[],
  pulledAt: Date,
): Promise<Set<string>> {
  if (scanIds.length === 0) return new Set();
  await lockCardReservations(tx, orgId);
  await settleWhileLocked(tx, orgId, pulledAt);
  const result = await tx.execute(sql`
    UPDATE card_reservations cr
    SET pulled_at = COALESCE(cr.pulled_at, ${pulledAt}),
      guest_alert = CASE WHEN cr.pulled_at IS NULL THEN 'readyForPickup' ELSE cr.guest_alert END,
      guest_alert_at = CASE WHEN cr.pulled_at IS NULL THEN ${pulledAt} ELSE cr.guest_alert_at END
    FROM collection_cards cc
    WHERE cc.id = cr.collection_card_id
      AND cr.org_id = ${orgId}
      AND cr.status = 'ready'
      AND cc.guid = ANY(${uuidArraySql(scanIds)})
    RETURNING cc.guid::text AS scan_id
  `);
  return new Set((result.rows as { scan_id: string }[]).map((row) => row.scan_id));
}

export async function unlinkCardReservationPick(
  tx: Transaction,
  orgId: string,
  orderId: number,
): Promise<void> {
  await tx
    .update(cardReservations)
    .set({ fulfilmentOrderId: null })
    .where(and(eq(cardReservations.orgId, orgId), eq(cardReservations.fulfilmentOrderId, orderId)));
}

export async function reservationRequestGuidsOfPick(
  tx: Transaction,
  orgId: string,
  orderId: number,
): Promise<string[]> {
  const rows = await tx
    .selectDistinct({ requestGuid: cardReservations.requestGuid })
    .from(cardReservations)
    .where(
      and(
        eq(cardReservations.orgId, orgId),
        eq(cardReservations.fulfilmentOrderId, orderId),
        eq(cardReservations.status, "ready"),
      ),
    );
  return rows.map((row) => row.requestGuid);
}

export async function reservationHeldScanIds(
  tx: Transaction,
  orgId: string,
  scanIds: string[],
): Promise<string[]> {
  if (scanIds.length === 0) return [];
  const rows = await tx
    .select({ scanId: collectionCards.guid })
    .from(cardReservations)
    .innerJoin(collectionCards, eq(collectionCards.id, cardReservations.collectionCardId))
    .where(
      and(
        eq(cardReservations.orgId, orgId),
        eq(cardReservations.status, "ready"),
        sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
      ),
    );
  return rows.flatMap((row) => (row.scanId ? [row.scanId] : []));
}

export async function cancelMyCardReservations(
  tx: Transaction,
  guestUserId: string,
  selection: CardReservationSelection,
): Promise<string | null> {
  const [owned] = await tx
    .select({ orgId: cardReservations.orgId })
    .from(cardReservations)
    .where(
      and(
        selectedReservationSql(selection),
        eq(cardReservations.guestUserId, guestUserId),
        inArray(cardReservations.status, ACTIVE_STATUSES),
      ),
    )
    .limit(1);
  if (!owned) return null;
  await lockCardReservations(tx, owned.orgId);
  const now = new Date();
  const cancelled = await tx
    .update(cardReservations)
    .set({ status: "cancelled", closedAt: now, guestAlert: null, guestAlertAt: null })
    .where(
      and(
        isActiveReservation(owned.orgId),
        selectedReservationSql(selection),
        eq(cardReservations.guestUserId, guestUserId),
      ),
    )
    .returning({ id: cardReservations.id });
  if (cancelled.length === 0) return null;
  await settleWhileLocked(tx, owned.orgId, now);
  return owned.orgId;
}
