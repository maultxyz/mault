import {
  CARD_RESERVATION_ACTIVE_STATUSES,
  MY_CARD_RESERVATIONS_LIST_MAX,
  buildShopCatalogLinkUrl,
  type CardReservationGuestAlert,
  type MyCardReservation,
} from "@magic-vault/shared";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Transaction } from "../db";
import { cardReservations, collectionCards, shopCatalogs } from "../db/schema";
import { cardReservationQueuesByCard } from "./card-reservation-settlement";
import {
  loadActiveCardReservationRows,
  settleCardReservations,
  toPublicCardReservation,
} from "./card-reservations";
import { getWebUrl } from "./constants/urls";
import type { ClaimMyCardReservationsInput } from "./interfaces/card-reservations";
import { shopCatalogLinkToken } from "./shop-catalogs";
import { shortLinkUrlFor } from "./shortener-client";

async function catalogUrlOf(
  catalog: typeof shopCatalogs.$inferSelect | null,
): Promise<string | null> {
  if (!catalog || catalog.isDeleted) return null;
  return buildShopCatalogLinkUrl(getWebUrl(), {
    guid: catalog.guid,
    isPublic: catalog.isPublic,
    linkToken: await shopCatalogLinkToken(catalog.guid, catalog.orgId, catalog.shareLinkVersion),
    shortUrl: shortLinkUrlFor(catalog.shortCode),
  });
}

export async function listMyCardReservations(
  tx: Transaction,
  guestUserId: string,
): Promise<MyCardReservation[]> {
  const activeOrgs = await tx
    .selectDistinct({ orgId: cardReservations.orgId })
    .from(cardReservations)
    .where(
      and(
        eq(cardReservations.guestUserId, guestUserId),
        inArray(cardReservations.status, [...CARD_RESERVATION_ACTIVE_STATUSES]),
      ),
    );
  const queuesByOrg = new Map<string, ReturnType<typeof cardReservationQueuesByCard>>();
  for (const { orgId } of activeOrgs) {
    await settleCardReservations(tx, orgId);
    queuesByOrg.set(
      orgId,
      cardReservationQueuesByCard(await loadActiveCardReservationRows(tx, orgId)),
    );
  }
  const rows = await tx
    .select({ reservation: cardReservations, scanId: collectionCards.guid, catalog: shopCatalogs })
    .from(cardReservations)
    .leftJoin(collectionCards, eq(collectionCards.id, cardReservations.collectionCardId))
    .leftJoin(shopCatalogs, eq(shopCatalogs.id, cardReservations.shopCatalogId))
    .where(eq(cardReservations.guestUserId, guestUserId))
    .orderBy(desc(cardReservations.createdAt), desc(cardReservations.id))
    .limit(MY_CARD_RESERVATIONS_LIST_MAX);
  const catalogUrls = new Map<number, string | null>();
  for (const row of rows) {
    if (row.catalog && !catalogUrls.has(row.catalog.id)) {
      catalogUrls.set(row.catalog.id, await catalogUrlOf(row.catalog));
    }
  }
  return rows.map(({ reservation, scanId, catalog }) => ({
    ...toPublicCardReservation(
      reservation,
      scanId,
      queuesByOrg.get(reservation.orgId)?.get(reservation.collectionCardId) ?? [],
    ),
    catalogName: catalog && !catalog.isDeleted ? catalog.name : null,
    catalogUrl: catalog ? (catalogUrls.get(catalog.id) ?? null) : null,
    guestName: reservation.guestName,
    guestAlert: reservation.guestAlert as CardReservationGuestAlert | null,
    guestAlertAt: reservation.guestAlertAt?.toISOString() ?? null,
  }));
}

export async function claimMyCardReservations(
  tx: Transaction,
  input: ClaimMyCardReservationsInput,
): Promise<number> {
  const claimed = await tx
    .update(cardReservations)
    .set({ guestUserId: input.guestUserId })
    .where(
      and(
        eq(cardReservations.guestKeyHash, input.guestKeyHash),
        isNull(cardReservations.guestUserId),
      ),
    )
    .returning({ id: cardReservations.id });
  return claimed.length;
}

export async function markMyCardReservationAlertsSeen(
  tx: Transaction,
  guestUserId: string,
  reservationGuids: string[],
): Promise<void> {
  await tx
    .update(cardReservations)
    .set({ guestAlert: null, guestAlertAt: null })
    .where(
      and(
        eq(cardReservations.guestUserId, guestUserId),
        inArray(cardReservations.guid, reservationGuids),
      ),
    );
}
