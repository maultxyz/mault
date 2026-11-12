import {
  PRICE_SOURCE_FIELDS,
  WIDGET_VALUE_SNAPSHOT_RETENTION_DAYS,
  type OrgPricing,
} from "@magic-vault/shared";
import { and, count, eq, lt, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import {
  cardPrices,
  collectionCards,
  collections,
  collectionValueSnapshots,
  games,
} from "../db/schema";
import {
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";
import {
  COLLECTION_VALUE_SNAPSHOT_MIN_INTERVAL_MS,
  COLLECTION_VALUE_SNAPSHOT_TRACKED_ORG_DAYS,
} from "./constants/widget-summary";
import { ONE_DAY_MS } from "./constants/timing";
import type {
  CollectionValueRow,
  PreviousCollectionValues,
} from "./interfaces/widget-summary";
import { loadOrgPricing } from "./price-source";

const lastSnapshotAtByOrgId = new Map<string, number>();

function utcDay(timestamp: number = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export async function loadCollectionValues(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<{ pricing: OrgPricing; currency: string; rows: CollectionValueRow[] }> {
  const pricing = await loadOrgPricing(runner, orgId);
  const cardPrice = collectionCardPriceSql(pricing);
  const rows = await runner
    .select({
      guid: collections.guid,
      name: collections.name,
      cardCount: count(collectionCards.id),
      value: sql<number | null>`sum(${cardPrice})`,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(and(eq(collections.orgId, orgId), eq(collections.isDeleted, false)))
    .groupBy(collections.id, collections.guid, collections.name);
  return {
    pricing,
    currency: PRICE_SOURCE_FIELDS[pricing.source].currency,
    rows: rows
      .filter((row): row is typeof row & { guid: string } => row.guid !== null)
      .map((row) => ({
        guid: row.guid,
        name: row.name,
        cardCount: Number(row.cardCount),
        totalValue: row.value == null ? 0 : Number(row.value),
      })),
  };
}

export async function writeCollectionValueSnapshots(
  orgId: string,
  currency: string,
  rows: CollectionValueRow[],
): Promise<void> {
  lastSnapshotAtByOrgId.set(orgId, Date.now());
  const day = utcDay();
  if (rows.length > 0) {
    await db
      .insert(collectionValueSnapshots)
      .values(
        rows.map((row) => ({
          orgId,
          collectionGuid: row.guid,
          day,
          cardCount: row.cardCount,
          marketValue: row.totalValue,
          currency,
        })),
      )
      .onConflictDoUpdate({
        target: [collectionValueSnapshots.collectionGuid, collectionValueSnapshots.day],
        set: {
          cardCount: sql`excluded.card_count`,
          marketValue: sql`excluded.market_value`,
          currency: sql`excluded.currency`,
          updatedAt: new Date(),
        },
      });
  }
  await db
    .delete(collectionValueSnapshots)
    .where(
      and(
        eq(collectionValueSnapshots.orgId, orgId),
        lt(
          collectionValueSnapshots.day,
          utcDay(Date.now() - WIDGET_VALUE_SNAPSHOT_RETENTION_DAYS * ONE_DAY_MS),
        ),
      ),
    );
}

export function isCollectionValueSnapshotDue(orgId: string): boolean {
  const lastSnapshotAt = lastSnapshotAtByOrgId.get(orgId);
  return (
    lastSnapshotAt === undefined ||
    utcDay(lastSnapshotAt) !== utcDay() ||
    Date.now() - lastSnapshotAt >= COLLECTION_VALUE_SNAPSHOT_MIN_INTERVAL_MS
  );
}

export async function loadPreviousCollectionValues(
  tx: Transaction,
  orgId: string,
  currency: string,
): Promise<PreviousCollectionValues | null> {
  const [latest] = await tx
    .select({ day: sql<string | null>`max(${collectionValueSnapshots.day})` })
    .from(collectionValueSnapshots)
    .where(
      and(
        eq(collectionValueSnapshots.orgId, orgId),
        eq(collectionValueSnapshots.currency, currency),
        lt(collectionValueSnapshots.day, utcDay()),
      ),
    );
  if (!latest?.day) return null;
  const rows = await tx
    .select({
      collectionGuid: collectionValueSnapshots.collectionGuid,
      cardCount: collectionValueSnapshots.cardCount,
      marketValue: collectionValueSnapshots.marketValue,
    })
    .from(collectionValueSnapshots)
    .where(
      and(
        eq(collectionValueSnapshots.orgId, orgId),
        eq(collectionValueSnapshots.currency, currency),
        eq(collectionValueSnapshots.day, latest.day),
      ),
    );
  return {
    day: latest.day,
    byCollectionGuid: new Map(
      rows.map((row) => [
        row.collectionGuid,
        { cardCount: row.cardCount, totalValue: row.marketValue },
      ]),
    ),
  };
}

export async function snapshotTrackedOrgCollectionValues(
  log: (message: string) => void,
): Promise<void> {
  const since = utcDay(
    Date.now() - COLLECTION_VALUE_SNAPSHOT_TRACKED_ORG_DAYS * ONE_DAY_MS,
  );
  const trackedOrgs = await db
    .selectDistinct({ orgId: collectionValueSnapshots.orgId })
    .from(collectionValueSnapshots)
    .where(sql`${collectionValueSnapshots.day} >= ${since}`);
  let failedOrgs = 0;
  for (const { orgId } of trackedOrgs) {
    try {
      const { currency, rows } = await loadCollectionValues(db, orgId);
      await writeCollectionValueSnapshots(orgId, currency, rows);
    } catch (err) {
      failedOrgs += 1;
      console.error("[collection-value-snapshots] Snapshot failed for org", orgId, err);
    }
  }
  log(
    `Collection value snapshots: ${trackedOrgs.length - failedOrgs} orgs, ${failedOrgs} failed.`,
  );
}
