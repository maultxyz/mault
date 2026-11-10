import {
  CARD_HOLD_GUEST_KEY_MAX_LENGTH,
  CARD_HOLD_GUEST_KEY_MIN_LENGTH,
  MAX_ACTIVE_HOLDS_PER_GUEST,
  type CardCondition,
  type CardHold,
  type CardHoldShareLinkKind,
  type CardHoldsChangedEvent,
  type PublicCardHold,
} from "@magic-vault/shared";
import { createHash } from "node:crypto";
import { and, count, eq, gt, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  cardHolds,
  collectionCards,
  collections,
  storageLocations,
} from "../db/schema";
import type {
  CardHoldOwnerFilter,
  CardHoldScope,
  PlaceCardHoldInput,
  PlaceCardHoldResult,
} from "./interfaces/card-holds";

export function hashCardHoldGuestKey(guestKey: string): string {
  return createHash("sha256").update(guestKey).digest("hex");
}

export function guestKeyHashFromHeader(headerValue: string | undefined): string | null {
  if (
    !headerValue ||
    headerValue.length < CARD_HOLD_GUEST_KEY_MIN_LENGTH ||
    headerValue.length > CARD_HOLD_GUEST_KEY_MAX_LENGTH
  ) {
    return null;
  }
  return hashCardHoldGuestKey(headerValue);
}

function isActiveHoldSql(): SQL {
  return or(isNull(cardHolds.expiresAt), gt(cardHolds.expiresAt, sql`now()`))!;
}

function scopeSql(scope: CardHoldScope): SQL {
  return scope.kind === "collection"
    ? eq(collectionCards.collectionId, scope.collectionId)
    : eq(collectionCards.locationId, scope.locationId);
}

async function deleteExpiredHolds(tx: Transaction, orgId: string): Promise<void> {
  await tx
    .delete(cardHolds)
    .where(and(eq(cardHolds.orgId, orgId), lte(cardHolds.expiresAt, sql`now()`)));
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function listPublicCardHolds(
  tx: Transaction,
  scope: CardHoldScope,
  guestKeyHash: string | null,
): Promise<PublicCardHold[]> {
  const rows = await tx
    .select({
      scanId: collectionCards.guid,
      expiresAt: cardHolds.expiresAt,
      approvedAt: cardHolds.approvedAt,
      guestKeyHash: cardHolds.guestKeyHash,
    })
    .from(cardHolds)
    .innerJoin(collectionCards, eq(collectionCards.id, cardHolds.collectionCardId))
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(
      and(
        eq(cardHolds.orgId, scope.orgId),
        scopeSql(scope),
        eq(collections.isDeleted, false),
        isActiveHoldSql(),
      ),
    );
  return rows.map((row) => ({
    scanId: row.scanId!,
    expiresAt: toIsoString(row.expiresAt),
    isApproved: row.approvedAt !== null,
    isMine: guestKeyHash !== null && row.guestKeyHash === guestKeyHash,
  }));
}

export async function placeCardHold(
  tx: Transaction,
  input: PlaceCardHoldInput,
): Promise<PlaceCardHoldResult> {
  const { scope } = input;
  await deleteExpiredHolds(tx, scope.orgId);
  const [card] = await tx
    .select({
      id: collectionCards.id,
      cardName: collectionCards.cardName,
      collectionGuid: collections.guid,
      locationGuid: storageLocations.guid,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(storageLocations, eq(storageLocations.id, collectionCards.locationId))
    .where(
      and(
        eq(collectionCards.guid, input.scanId),
        eq(collections.orgId, scope.orgId),
        eq(collections.isDeleted, false),
        scopeSql(scope),
      ),
    )
    .limit(1);
  if (!card) return { status: "card-not-found" };

  const [guestHolds] = await tx
    .select({ total: count() })
    .from(cardHolds)
    .where(
      and(
        eq(cardHolds.orgId, scope.orgId),
        eq(cardHolds.guestKeyHash, input.guestKeyHash),
        isActiveHoldSql(),
      ),
    );
  if ((guestHolds?.total ?? 0) >= MAX_ACTIVE_HOLDS_PER_GUEST) {
    return { status: "guest-limit-reached" };
  }

  const inserted = await tx
    .insert(cardHolds)
    .values({
      collectionCardId: card.id,
      guestName: input.guestName,
      guestNote: input.guestNote,
      guestKeyHash: input.guestKeyHash,
      shareLinkKind: scope.kind,
      expiresAt: sql`now() + make_interval(mins => ${input.holdMinutes})`,
      orgId: scope.orgId,
    })
    .onConflictDoNothing({ target: cardHolds.collectionCardId })
    .returning({ id: cardHolds.id });
  if (inserted.length === 0) return { status: "already-held" };

  return {
    status: "created",
    changed: {
      collectionGuid: card.collectionGuid!,
      locationGuid: card.locationGuid ?? null,
      createdHold: { cardName: card.cardName ?? "", guestName: input.guestName },
    },
  };
}

export async function releaseGuestCardHold(
  tx: Transaction,
  scope: CardHoldScope,
  scanId: string,
  guestKeyHash: string,
): Promise<CardHoldsChangedEvent | null> {
  const [hold] = await tx
    .select({
      id: cardHolds.id,
      collectionGuid: collections.guid,
      locationGuid: storageLocations.guid,
    })
    .from(cardHolds)
    .innerJoin(collectionCards, eq(collectionCards.id, cardHolds.collectionCardId))
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(storageLocations, eq(storageLocations.id, collectionCards.locationId))
    .where(
      and(
        eq(cardHolds.orgId, scope.orgId),
        eq(cardHolds.guestKeyHash, guestKeyHash),
        eq(collectionCards.guid, scanId),
        scopeSql(scope),
      ),
    )
    .limit(1);
  if (!hold) return null;
  await tx.delete(cardHolds).where(eq(cardHolds.id, hold.id));
  return {
    collectionGuid: hold.collectionGuid!,
    locationGuid: hold.locationGuid ?? null,
    createdHold: null,
  };
}

export async function listOwnerCardHolds(
  tx: Transaction,
  orgId: string,
  filter: CardHoldOwnerFilter,
): Promise<CardHold[]> {
  const rows = await tx
    .select({
      guid: cardHolds.guid,
      scanId: collectionCards.guid,
      collectionGuid: collections.guid,
      cardName: collectionCards.cardName,
      cardSetName: collectionCards.cardSetName,
      cardImage: collectionCards.cardImageSmall,
      isFoil: collectionCards.isFoil,
      condition: collectionCards.condition,
      guestName: cardHolds.guestName,
      guestNote: cardHolds.guestNote,
      shareLinkKind: cardHolds.shareLinkKind,
      expiresAt: cardHolds.expiresAt,
      approvedAt: cardHolds.approvedAt,
      createdAt: cardHolds.createdAt,
    })
    .from(cardHolds)
    .innerJoin(collectionCards, eq(collectionCards.id, cardHolds.collectionCardId))
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(storageLocations, eq(storageLocations.id, collectionCards.locationId))
    .where(
      and(
        eq(cardHolds.orgId, orgId),
        eq(collections.isDeleted, false),
        filter.collectionGuid ? eq(collections.guid, filter.collectionGuid) : undefined,
        filter.locationGuid
          ? and(
              eq(storageLocations.guid, filter.locationGuid),
              eq(storageLocations.isDeleted, false),
            )
          : undefined,
        isActiveHoldSql(),
      ),
    )
    .orderBy(cardHolds.createdAt);
  return rows.map((row) => ({
    guid: row.guid,
    scanId: row.scanId!,
    collectionGuid: row.collectionGuid!,
    cardName: row.cardName ?? "",
    cardSetName: row.cardSetName,
    cardImage: row.cardImage,
    isFoil: row.isFoil,
    condition: row.condition as CardCondition,
    guestName: row.guestName,
    guestNote: row.guestNote,
    shareLinkKind: row.shareLinkKind as CardHoldShareLinkKind,
    expiresAt: toIsoString(row.expiresAt),
    approvedAt: toIsoString(row.approvedAt),
    createdAt: row.createdAt.toISOString(),
  }));
}

async function changedEventForHold(
  tx: Transaction,
  orgId: string,
  holdGuid: string,
): Promise<{ id: number; changed: CardHoldsChangedEvent } | null> {
  const [hold] = await tx
    .select({
      id: cardHolds.id,
      collectionGuid: collections.guid,
      locationGuid: storageLocations.guid,
    })
    .from(cardHolds)
    .innerJoin(collectionCards, eq(collectionCards.id, cardHolds.collectionCardId))
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(storageLocations, eq(storageLocations.id, collectionCards.locationId))
    .where(
      and(eq(cardHolds.orgId, orgId), eq(cardHolds.guid, holdGuid), isActiveHoldSql()),
    )
    .limit(1);
  if (!hold) return null;
  return {
    id: hold.id,
    changed: {
      collectionGuid: hold.collectionGuid!,
      locationGuid: hold.locationGuid ?? null,
      createdHold: null,
    },
  };
}

export async function approveOwnerCardHold(
  tx: Transaction,
  orgId: string,
  holdGuid: string,
): Promise<CardHoldsChangedEvent | null> {
  const hold = await changedEventForHold(tx, orgId, holdGuid);
  if (!hold) return null;
  await tx
    .update(cardHolds)
    .set({ expiresAt: null, approvedAt: sql`now()` })
    .where(eq(cardHolds.id, hold.id));
  return hold.changed;
}

export async function releaseOwnerCardHold(
  tx: Transaction,
  orgId: string,
  holdGuid: string,
): Promise<CardHoldsChangedEvent | null> {
  const hold = await changedEventForHold(tx, orgId, holdGuid);
  if (!hold) return null;
  await tx.delete(cardHolds).where(eq(cardHolds.id, hold.id));
  return hold.changed;
}
