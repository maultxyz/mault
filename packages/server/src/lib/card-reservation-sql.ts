import { CARD_RESERVATION_ACTIVE_STATUSES } from "@magic-vault/shared";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import { cardReservations, collectionCards } from "../db/schema";

export async function activelyReservedScanIds(
  tx: Transaction,
  orgId: string,
  exceptPickOrderId: number | null = null,
): Promise<string[]> {
  const rows = await tx
    .selectDistinct({ scanId: collectionCards.guid })
    .from(cardReservations)
    .innerJoin(collectionCards, eq(collectionCards.id, cardReservations.collectionCardId))
    .where(
      and(
        eq(cardReservations.orgId, orgId),
        inArray(cardReservations.status, [...CARD_RESERVATION_ACTIVE_STATUSES]),
        exceptPickOrderId === null
          ? undefined
          : sql`${cardReservations.fulfilmentOrderId} IS DISTINCT FROM ${exceptPickOrderId}`,
      ),
    );
  return rows.flatMap((row) => (row.scanId ? [row.scanId] : []));
}

export function notHeldByCardReservationsSql(orgId: string, collectionCardIdColumn: SQL): SQL {
  return sql`NOT (${collectionCardIdColumn} = ANY(ARRAY(
    SELECT cr.collection_card_id
    FROM card_reservations cr
    WHERE cr.org_id = ${orgId}
      AND cr.status IN ('waiting', 'ready')
  )))`;
}
