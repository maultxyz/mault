import {
  PRICE_SOURCE_FIELDS,
  type InventoryCollectionRow,
  type InventoryTotals,
  type OrgPricing,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import {
  fulfilmentOrders,
  intakeLots,
  orgInventorySnapshots,
} from "../db/schema";
import { joinedScannedCardPriceSql } from "./card-price-sql";
import { CC_ALIAS_SQL_COLUMNS } from "./constants/card-prices";
import {
  INVENTORY_SNAPSHOT_INTERVAL_MS,
  INVENTORY_SNAPSHOT_STARTUP_DELAY_MS,
} from "./constants/business";
import type { InventoryRow } from "./interfaces/business";
import { loadOrgPricing } from "./price-source";

export async function loadInventoryByCollection(
  runner: Transaction | typeof db,
  orgId: string,
  pricing: OrgPricing,
): Promise<InventoryCollectionRow[]> {
  const currency = PRICE_SOURCE_FIELDS[pricing.source].currency;
  const price = joinedScannedCardPriceSql(pricing, CC_ALIAS_SQL_COLUMNS, "cp");
  const cost = sql`(CASE WHEN cc.acquisition_currency = ${currency} THEN cc.acquisition_cost END)`;
  const result = await runner.execute(sql`
    SELECT col.guid::text AS guid, col.name,
      count(cc.id)::int AS card_count,
      COALESCE(sum(${price}), 0)::float8 AS market_value,
      COALESCE(sum(${cost}), 0)::float8 AS cost_basis,
      count(${cost})::int AS costed_cards,
      COALESCE(sum(${price}) FILTER (WHERE ${cost} IS NOT NULL), 0)::float8 AS costed_market_value
    FROM collections col
    LEFT JOIN games g ON g.id = col.game_id
    LEFT JOIN (
      collection_cards cc
      LEFT JOIN intake_lots il ON il.id = cc.intake_lot_id
    ) ON cc.collection_id = col.id AND (il.id IS NULL OR il.status = 'accepted')
    LEFT JOIN card_prices cp ON cp.game_key = g.key
      AND cp.lang = COALESCE(cc.card_lang, col.lang)
      AND cp.card_id = cc.card_id
    WHERE col.org_id = ${orgId}
      AND col.is_deleted = false
    GROUP BY col.id
    ORDER BY market_value DESC, col.name
  `);
  return (result.rows as unknown as InventoryRow[]).map((r) => ({
    guid: r.guid,
    name: r.name,
    cardCount: Number(r.card_count),
    marketValue: Number(r.market_value),
    costBasis: Number(r.cost_basis),
    costedCards: Number(r.costed_cards),
    costedMarketValue: Number(r.costed_market_value),
  }));
}

export function sumInventory(rows: InventoryTotals[]): InventoryTotals {
  return rows.reduce<InventoryTotals>(
    (sum, row) => ({
      cardCount: sum.cardCount + row.cardCount,
      marketValue: sum.marketValue + row.marketValue,
      costBasis: sum.costBasis + row.costBasis,
      costedCards: sum.costedCards + row.costedCards,
      costedMarketValue: sum.costedMarketValue + row.costedMarketValue,
    }),
    {
      cardCount: 0,
      marketValue: 0,
      costBasis: 0,
      costedCards: 0,
      costedMarketValue: 0,
    },
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function writeInventorySnapshot(
  orgId: string,
  totals: InventoryTotals,
  currency: string,
): Promise<void> {
  const values = {
    cardCount: totals.cardCount,
    marketValue: totals.marketValue,
    costBasis: totals.costBasis,
    currency,
    updatedAt: new Date(),
  };
  await db
    .insert(orgInventorySnapshots)
    .values({ orgId, day: today(), ...values })
    .onConflictDoUpdate({
      target: [orgInventorySnapshots.orgId, orgInventorySnapshots.day],
      set: values,
    });
}

async function snapshotOrg(orgId: string): Promise<void> {
  const pricing = await loadOrgPricing(db, orgId);
  const rows = await loadInventoryByCollection(db, orgId, pricing);
  await writeInventorySnapshot(
    orgId,
    sumInventory(rows),
    PRICE_SOURCE_FIELDS[pricing.source].currency,
  );
}

async function snapshotBusinessOrgs(): Promise<void> {
  const result = await db.execute(sql`
    SELECT org_id FROM ${intakeLots} WHERE is_deleted = false
    UNION SELECT org_id FROM ${fulfilmentOrders} WHERE is_deleted = false
    UNION SELECT org_id FROM ${orgInventorySnapshots}
    EXCEPT SELECT org_id FROM ${orgInventorySnapshots} WHERE day = ${today()}
  `);
  for (const row of result.rows as { org_id: string }[]) {
    try {
      await snapshotOrg(row.org_id);
    } catch (err) {
      console.error("[inventory] Snapshot failed for org", row.org_id, err);
    }
  }
}

export function startInventorySnapshots(): void {
  const run = () => {
    snapshotBusinessOrgs().catch((err) =>
      console.error("[inventory] Snapshot run failed:", err),
    );
  };
  setTimeout(run, INVENTORY_SNAPSHOT_STARTUP_DELAY_MS).unref();
  setInterval(run, INVENTORY_SNAPSHOT_INTERVAL_MS).unref();
}

export async function loadInventoryHistory(
  tx: Transaction,
  orgId: string,
  currency: string,
  sinceDay: string,
) {
  return tx
    .select({
      day: orgInventorySnapshots.day,
      cardCount: orgInventorySnapshots.cardCount,
      marketValue: orgInventorySnapshots.marketValue,
      costBasis: orgInventorySnapshots.costBasis,
    })
    .from(orgInventorySnapshots)
    .where(
      and(
        eq(orgInventorySnapshots.orgId, orgId),
        eq(orgInventorySnapshots.currency, currency),
        sql`${orgInventorySnapshots.day} >= ${sinceDay}`,
      ),
    )
    .orderBy(orgInventorySnapshots.day);
}
