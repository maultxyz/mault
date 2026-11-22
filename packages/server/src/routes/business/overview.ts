import {
  BUSINESS_OVERVIEW_LATEST_ITEMS,
  BUSINESS_OVERVIEW_SALES_DAYS,
  cardReservationGroupStage,
  groupCardReservationsByRequest,
  type BusinessOverview,
  type BusinessOverviewReservations,
} from "@magic-vault/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../../db";
import { cardSales, collectionCards, fulfilmentOrders, intakeLots } from "../../db/schema";
import { listOwnerCardReservations } from "../../lib/card-reservations";
import { summarizeOrder, toOrderLines } from "../../lib/orders";
import { loadOrgPricing } from "../../lib/price-source";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { businessQuery, pricingCurrency } from "./shared";

async function loadIntakeOverview(tx: Transaction, orgId: string): Promise<BusinessOverview["intake"]> {
  const lots = await tx
    .select({
      guid: intakeLots.guid,
      customerName: intakeLots.customerName,
      createdAt: intakeLots.createdAt,
      cardCount: sql<number>`(
        SELECT count(*) FROM ${collectionCards}
        WHERE ${collectionCards.intakeLotId} = ${intakeLots.id}
      )::int`,
    })
    .from(intakeLots)
    .where(
      and(
        eq(intakeLots.orgId, orgId),
        eq(intakeLots.status, "open"),
        eq(intakeLots.isDeleted, false),
      ),
    )
    .orderBy(desc(intakeLots.createdAt), desc(intakeLots.id));
  return {
    openLotCount: lots.length,
    openCardCount: lots.reduce((sum, lot) => sum + Number(lot.cardCount), 0),
    latestOpenLots: lots.slice(0, BUSINESS_OVERVIEW_LATEST_ITEMS).map((lot) => ({
      guid: lot.guid!,
      customerName: lot.customerName,
      cardCount: Number(lot.cardCount),
      createdAt: lot.createdAt.toISOString(),
    })),
  };
}

async function loadPicksOverview(
  tx: Transaction,
  orgId: string,
  canViewCosts: boolean,
): Promise<BusinessOverview["picks"]> {
  const rows = await tx
    .select()
    .from(fulfilmentOrders)
    .where(
      and(
        eq(fulfilmentOrders.orgId, orgId),
        eq(fulfilmentOrders.status, "open"),
        eq(fulfilmentOrders.isDeleted, false),
      ),
    )
    .orderBy(desc(fulfilmentOrders.createdAt), desc(fulfilmentOrders.id));
  const picks = rows.map((row) => summarizeOrder(row, toOrderLines(row.lines), null, canViewCosts));
  return {
    openPickCount: picks.length,
    cardsToPick: picks.reduce((sum, pick) => sum + Math.max(pick.allocated - pick.picked, 0), 0),
    readyToCompleteCount: picks.filter((pick) => pick.allocated > 0 && pick.picked >= pick.allocated)
      .length,
    latestOpenPicks: picks.slice(0, BUSINESS_OVERVIEW_LATEST_ITEMS).map((pick) => ({
      guid: pick.guid,
      name: pick.name,
      quantity: pick.allocated,
      picked: pick.picked,
      createdAt: pick.createdAt,
    })),
  };
}

async function loadReservationsOverview(
  tx: Transaction,
  orgId: string,
): Promise<BusinessOverviewReservations> {
  const groups = groupCardReservationsByRequest(await listOwnerCardReservations(tx, orgId, "active"));
  const counts: BusinessOverviewReservations = {
    readyForPickup: 0,
    toPull: 0,
    beingPicked: 0,
    waiting: 0,
  };
  for (const group of groups) {
    const stage = cardReservationGroupStage(group);
    if (stage && stage in counts) counts[stage as keyof BusinessOverviewReservations] += 1;
  }
  return counts;
}

async function loadSalesOverview(
  tx: Transaction,
  orgId: string,
  canViewCosts: boolean,
): Promise<BusinessOverview["sales"]> {
  const currency = pricingCurrency(await loadOrgPricing(tx, orgId));
  const result = await tx.execute(sql`
    SELECT
      to_char(sales_day.day, 'YYYY-MM-DD') AS day,
      count(${cardSales.id})::int AS card_count,
      sum(${cardSales.salePrice}) FILTER (WHERE ${cardSales.currency} = ${currency}) AS revenue,
      sum(${cardSales.acquisitionCost}) FILTER (WHERE ${cardSales.currency} = ${currency} AND ${cardSales.acquisitionCost} IS NOT NULL AND ${cardSales.salePrice} IS NOT NULL) AS cost_of_sold,
      sum(${cardSales.salePrice}) FILTER (WHERE ${cardSales.currency} = ${currency} AND ${cardSales.acquisitionCost} IS NOT NULL AND ${cardSales.salePrice} IS NOT NULL) AS costed_revenue,
      count(${cardSales.id}) FILTER (WHERE ${cardSales.currency} = ${currency} AND ${cardSales.acquisitionCost} IS NOT NULL AND ${cardSales.salePrice} IS NOT NULL)::int AS costed_count
    FROM generate_series(
      date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${BUSINESS_OVERVIEW_SALES_DAYS - 1}::int),
      date_trunc('day', now() AT TIME ZONE 'UTC'),
      interval '1 day'
    ) AS sales_day(day)
    LEFT JOIN ${cardSales}
      ON ${cardSales.orgId} = ${orgId}
      AND ${cardSales.soldAt} >= sales_day.day
      AND ${cardSales.soldAt} < sales_day.day + interval '1 day'
    GROUP BY sales_day.day
    ORDER BY sales_day.day
  `);
  const rows = result.rows as {
    day: string;
    card_count: number;
    revenue: string | number | null;
    cost_of_sold: string | number | null;
    costed_revenue: string | number | null;
    costed_count: number;
  }[];
  const roundMoney = (value: number) => Math.round(value * 100) / 100;
  const history = rows.map((row) => ({
    day: row.day,
    cardCount: Number(row.card_count),
    revenue: canViewCosts ? roundMoney(Number(row.revenue ?? 0)) : null,
  }));
  const costOfSold = roundMoney(rows.reduce((sum, row) => sum + Number(row.cost_of_sold ?? 0), 0));
  const costedRevenue = rows.reduce((sum, row) => sum + Number(row.costed_revenue ?? 0), 0);
  return {
    cardCount: history.reduce((sum, day) => sum + day.cardCount, 0),
    total: canViewCosts
      ? roundMoney(history.reduce((sum, day) => sum + (day.revenue ?? 0), 0))
      : null,
    costOfSold: canViewCosts ? costOfSold : null,
    profit: canViewCosts ? roundMoney(costedRevenue - costOfSold) : null,
    costedCount: canViewCosts ? rows.reduce((sum, row) => sum + Number(row.costed_count ?? 0), 0) : 0,
    currency,
    history,
  };
}

export const overviewRoute = new Hono<AppEnv>().get("/overview", requireAuth, requireOrg, (c) =>
  businessQuery(c, async (tx, access) => {
    const orgId = c.get("orgId");
    const data: BusinessOverview = {
      intake: await loadIntakeOverview(tx, orgId),
      picks: await loadPicksOverview(tx, orgId, access.canViewCosts),
      reservations: access.canFulfilOrders ? await loadReservationsOverview(tx, orgId) : null,
      sales: await loadSalesOverview(tx, orgId, access.canViewCosts),
    };
    return { success: true, data };
  }),
);
