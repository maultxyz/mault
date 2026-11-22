import {
  csvEscape,
  SALES_REPORT_BUY_PARAM,
  SALES_REPORT_EXPORT_MAX_ROWS,
  SALES_REPORT_FROM_PARAM,
  SALES_REPORT_PAGE_SIZE,
  SALES_REPORT_TO_PARAM,
  type BuyPerformance,
  type InventoryMargin,
  type SaleChannel,
  type SaleRow,
  type SalesReport,
  type SalesReportTotals,
  type UnmovedBuy,
} from "@magic-vault/shared";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { Hono, type Context } from "hono";
import type { Transaction } from "../../db";
import {
  cardPrices,
  cardSales,
  collectionCards,
  collections,
  games,
  intakeLots,
} from "../../db/schema";
import { collectionCardPriceSql, collectionCardPricesJoinOn } from "../../lib/card-price-sql";
import { loadSellPriceConfig, sellPriceSql } from "../../lib/card-pricing";
import {
  BUSINESS_FORBIDDEN_RESULT,
  BUSINESS_UPGRADE_REQUIRED_RESULT,
  INTAKE_LOT_NOT_FOUND_MESSAGE,
  INVENTORY_MARGIN_CACHE_MAX_ENTRIES,
  INVENTORY_MARGIN_CACHE_TTL_MS,
  INVENTORY_MARGIN_MIN_MS_BETWEEN_LOADS,
  ISO_DAY_PATTERN,
} from "../../lib/constants/business";
import { findIntakeLot } from "../../lib/intake";
import { inventoryCardSql } from "../../lib/inventory-sql";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { loadOrgPricing } from "../../lib/price-source";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { isUuid } from "../collections/cards-query";
import { businessQuery, notFound, pricingCurrency } from "./shared";
import type { BusinessResult, SaleQueryRow } from "../../lib/interfaces/business";

const inventoryMarginCache = createOrgReadCache<InventoryMargin>(
  INVENTORY_MARGIN_CACHE_TTL_MS,
  INVENTORY_MARGIN_CACHE_MAX_ENTRIES,
  INVENTORY_MARGIN_MIN_MS_BETWEEN_LOADS,
);

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentOf(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

function sellValueSql(market: SQL, config: Parameters<typeof sellPriceSql>[1], currency: string) {
  return sellPriceSql(market, config, currency, "collection_cards");
}

async function loadBuyPerformance(
  tx: Transaction,
  orgId: string,
  lot: { id: number; paidTotal: number | null; cardCount: number | null; currency?: string | null },
): Promise<BuyPerformance> {
  const pricing = await loadOrgPricing(tx, orgId);
  const currency = pricingCurrency(pricing);
  const config = await loadSellPriceConfig(tx, orgId);
  const [sold] = await tx
    .select({
      soldCount: sql<number>`count(*)::int`,
      revenue: sql<number | null>`sum(${cardSales.salePrice})`,
      costOfSold: sql<number | null>`sum(${cardSales.acquisitionCost})`,
    })
    .from(cardSales)
    .where(
      and(
        eq(cardSales.orgId, orgId),
        eq(cardSales.intakeLotId, lot.id),
        eq(cardSales.currency, currency),
      ),
    );
  const [remaining] = await tx
    .select({
      remainingCount: sql<number>`count(*)::int`,
      remainingCost: sql<number | null>`sum(${collectionCards.acquisitionCost}) FILTER (WHERE ${collectionCards.acquisitionCurrency} = ${currency})`,
      remainingSellValue: sql<number | null>`sum(${sellValueSql(collectionCardPriceSql(pricing), config, currency)})`,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(
      and(
        eq(collectionCards.intakeLotId, lot.id),
        eq(collections.isDeleted, false),
      ),
    );
  const revenue = roundMoney(Number(sold?.revenue ?? 0));
  const costOfSold = roundMoney(Number(sold?.costOfSold ?? 0));
  const paidTotal = lot.paidTotal;
  return {
    currency,
    paidTotal,
    cardCount: lot.cardCount ?? Number(sold?.soldCount ?? 0) + Number(remaining?.remainingCount ?? 0),
    soldCount: Number(sold?.soldCount ?? 0),
    revenue,
    costOfSold,
    profit: roundMoney(revenue - costOfSold),
    returnPercent: paidTotal ? percentOf(revenue, paidTotal) : null,
    remainingCount: Number(remaining?.remainingCount ?? 0),
    remainingCost: roundMoney(Number(remaining?.remainingCost ?? 0)),
    remainingSellValue: roundMoney(Number(remaining?.remainingSellValue ?? 0)),
  };
}

function salesFilters(c: Context<AppEnv>, orgId: string, buyLotId: number | null): SQL {
  const from = c.req.query(SALES_REPORT_FROM_PARAM);
  const to = c.req.query(SALES_REPORT_TO_PARAM);
  const conditions: SQL[] = [sql`cs.org_id = ${orgId}`];
  if (from && ISO_DAY_PATTERN.test(from)) {
    conditions.push(sql`cs.sold_at >= ${from}::date`);
  }
  if (to && ISO_DAY_PATTERN.test(to)) {
    conditions.push(sql`cs.sold_at < (${to}::date + interval '1 day')`);
  }
  if (buyLotId !== null) conditions.push(sql`cs.intake_lot_id = ${buyLotId}`);
  return sql.join(conditions, sql` AND `);
}

async function resolveBuyLotId(
  tx: Transaction,
  orgId: string,
  c: Context<AppEnv>,
): Promise<number | null | "missing"> {
  const buyGuid = c.req.query(SALES_REPORT_BUY_PARAM);
  if (!buyGuid) return null;
  if (!isUuid(buyGuid)) return "missing";
  const lot = await findIntakeLot(tx, orgId, buyGuid);
  return lot ? lot.id : "missing";
}

function toSaleRow(row: SaleQueryRow, canViewCosts: boolean): SaleRow {
  const salePrice = row.sale_price == null ? null : Number(row.sale_price);
  const cost = canViewCosts && row.acquisition_cost != null ? Number(row.acquisition_cost) : null;
  const channel: SaleChannel = row.order_id == null ? "reservation" : "pick";
  return {
    guid: row.guid,
    soldAt: new Date(row.sold_at).toISOString(),
    cardName: row.card_name,
    setCode: row.set_code,
    collectorNumber: row.collector_number,
    isFoil: row.is_foil,
    condition: row.condition,
    salePrice,
    cost,
    profit: salePrice != null && cost != null ? roundMoney(salePrice - cost) : null,
    currency: row.currency,
    collectionName: row.collection_name,
    channel,
    buyGuid: row.buy_guid,
    buyName: row.buy_name,
  };
}

const SALE_SELECT = sql`
  SELECT cs.guid::text AS guid, cs.sold_at, cs.card_name, cs.set_code, cs.collector_number,
    cs.is_foil, cs.condition, cs.sale_price, cs.acquisition_cost, cs.currency,
    cs.collection_name, cs.order_id, il.guid::text AS buy_guid, il.customer_name AS buy_name
  FROM card_sales cs
  LEFT JOIN intake_lots il ON il.id = cs.intake_lot_id`;

function salesAccessResult(access: {
  isLocked: boolean;
  canViewCosts: boolean;
  canFulfilOrders: boolean;
}): BusinessResult | null {
  if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
  if (!access.canViewCosts && !access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
  return null;
}

export const buysRoute = new Hono<AppEnv>()
  .get("/intake/unmoved", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      const orgId = c.get("orgId");
      const result = await tx.execute(sql`
        SELECT il.guid::text AS guid, il.customer_name, col.guid::text AS collection_guid,
          col.name AS collection_name, g.guid::text AS game_guid,
          (SELECT count(*) FROM collection_cards cc WHERE cc.collection_id = col.id)::int AS card_count
        FROM intake_lots il
        JOIN collections col ON col.id = il.collection_id
        LEFT JOIN games g ON g.id = col.game_id
        WHERE il.org_id = ${orgId}
          AND il.status = 'accepted'
          AND il.is_deleted = false
          AND il.owns_collection
          AND col.is_deleted = false
          AND EXISTS (SELECT 1 FROM collection_cards cc WHERE cc.collection_id = col.id)
        ORDER BY il.accepted_at DESC NULLS LAST
      `);
      const data: UnmovedBuy[] = (
        result.rows as {
          guid: string;
          customer_name: string;
          collection_guid: string;
          collection_name: string;
          game_guid: string | null;
          card_count: number;
        }[]
      ).map((row) => ({
        guid: row.guid,
        customerName: row.customer_name,
        collectionGuid: row.collection_guid,
        collectionName: row.collection_name,
        gameGuid: row.game_guid,
        cardCount: Number(row.card_count),
      }));
      return { success: true, data };
    }),
  )
  .get("/intake/:guid/performance", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canViewCosts) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const lot = await findIntakeLot(tx, orgId, c.req.param("guid"));
      if (!lot) return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      const data = await loadBuyPerformance(tx, orgId, lot);
      return { success: true, data };
    }),
  )
  .get("/sales", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      const denied = salesAccessResult(access);
      if (denied) return denied;
      const orgId = c.get("orgId");
      const buyLotId = await resolveBuyLotId(tx, orgId, c);
      if (buyLotId === "missing") return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      const currency = pricingCurrency(await loadOrgPricing(tx, orgId));
      const where = salesFilters(c, orgId, buyLotId);
      const page = Math.max(Number.parseInt(c.req.query("page") ?? "", 10) || 1, 1);
      const totalsResult = await tx.execute(sql`
        SELECT count(*)::int AS sale_count,
          sum(cs.sale_price) FILTER (WHERE cs.currency = ${currency}) AS revenue,
          sum(cs.acquisition_cost) FILTER (WHERE cs.currency = ${currency} AND cs.acquisition_cost IS NOT NULL AND cs.sale_price IS NOT NULL) AS cost,
          sum(cs.sale_price) FILTER (WHERE cs.currency = ${currency} AND cs.acquisition_cost IS NOT NULL AND cs.sale_price IS NOT NULL) AS costed_revenue,
          count(*) FILTER (WHERE cs.currency = ${currency} AND cs.acquisition_cost IS NOT NULL AND cs.sale_price IS NOT NULL)::int AS costed_count
        FROM card_sales cs
        WHERE ${where}
      `);
      const totalsRow = totalsResult.rows[0] as {
        sale_count: number;
        revenue: number | string | null;
        cost: number | string | null;
        costed_revenue: number | string | null;
        costed_count: number;
      };
      const costedRevenue = Number(totalsRow?.costed_revenue ?? 0);
      const cost = Number(totalsRow?.cost ?? 0);
      const profit = roundMoney(costedRevenue - cost);
      const totals: SalesReportTotals = {
        saleCount: Number(totalsRow?.sale_count ?? 0),
        revenue: roundMoney(Number(totalsRow?.revenue ?? 0)),
        cost: access.canViewCosts ? roundMoney(cost) : null,
        profit: access.canViewCosts ? profit : null,
        marginPercent: access.canViewCosts ? percentOf(profit, costedRevenue) : null,
        costedCount: access.canViewCosts ? Number(totalsRow?.costed_count ?? 0) : 0,
      };
      const rows = await tx.execute(sql`
        ${SALE_SELECT}
        WHERE ${where}
        ORDER BY cs.sold_at DESC, cs.id DESC
        LIMIT ${SALES_REPORT_PAGE_SIZE} OFFSET ${(page - 1) * SALES_REPORT_PAGE_SIZE}
      `);
      const data: SalesReport = {
        currency,
        items: (rows.rows as unknown as SaleQueryRow[]).map((row) => toSaleRow(row, access.canViewCosts)),
        total: totals.saleCount,
        page,
        pageSize: SALES_REPORT_PAGE_SIZE,
        totals,
      };
      return { success: true, data };
    }),
  )
  .get("/sales/export", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    let csv: string | null = null;
    const response = await businessQuery(c, async (tx, access) => {
      const denied = salesAccessResult(access);
      if (denied) return denied;
      const buyLotId = await resolveBuyLotId(tx, orgId, c);
      if (buyLotId === "missing") return notFound(INTAKE_LOT_NOT_FOUND_MESSAGE);
      const rows = await tx.execute(sql`
        ${SALE_SELECT}
        WHERE ${salesFilters(c, orgId, buyLotId)}
        ORDER BY cs.sold_at DESC, cs.id DESC
        LIMIT ${SALES_REPORT_EXPORT_MAX_ROWS}
      `);
      const header = [
        "Sold at",
        "Card",
        "Set",
        "Number",
        "Foil",
        "Condition",
        "Sale price",
        "Cost",
        "Profit",
        "Currency",
        "Collection",
        "Channel",
        "Buy",
      ];
      const lines = (rows.rows as unknown as SaleQueryRow[]).map((row) => {
        const sale = toSaleRow(row, access.canViewCosts);
        return [
          sale.soldAt,
          sale.cardName,
          sale.setCode ?? "",
          sale.collectorNumber ?? "",
          sale.isFoil ? "foil" : "",
          sale.condition,
          sale.salePrice?.toFixed(2) ?? "",
          sale.cost?.toFixed(2) ?? "",
          sale.profit?.toFixed(2) ?? "",
          sale.currency,
          sale.collectionName ?? "",
          sale.channel,
          sale.buyName ?? "",
        ]
          .map((value) => csvEscape(value))
          .join(",");
      });
      csv = [header.join(","), ...lines].join("\n");
      return { success: true, data: null };
    });
    if (csv === null) return response;
    return c.body(csv, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sales.csv"',
    });
  })
  .get("/inventory/margin", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canViewCosts) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const pricing = await loadOrgPricing(tx, orgId);
      const currency = pricingCurrency(pricing);
      const config = await loadSellPriceConfig(tx, orgId);
      const data = await inventoryMarginCache.get(
        orgId,
        `${pricing.source}|${JSON.stringify(pricing.conditionMultipliers)}|${JSON.stringify(config)}`,
        async () => {
          const sellValue = sellValueSql(collectionCardPriceSql(pricing), config, currency);
          const costed = sql`${collectionCards.acquisitionCost} IS NOT NULL AND ${collectionCards.acquisitionCurrency} = ${currency}`;
          const [row] = await tx
            .select({
              cardCount: sql<number>`count(*)::int`,
              costedCount: sql<number>`count(*) FILTER (WHERE ${costed})::int`,
              costBasis: sql<number | null>`sum(${collectionCards.acquisitionCost}) FILTER (WHERE ${costed})`,
              sellValue: sql<number | null>`sum(${sellValue})`,
              sellValueOfCosted: sql<number | null>`sum(${sellValue}) FILTER (WHERE ${costed})`,
            })
            .from(collectionCards)
            .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
            .leftJoin(games, eq(games.id, collections.gameId))
            .leftJoin(cardPrices, collectionCardPricesJoinOn())
            .where(
              and(
                eq(collectionCards.orgId, orgId),
                eq(collections.isDeleted, false),
                inventoryCardSql(),
              ),
            );
          const costBasis = roundMoney(Number(row?.costBasis ?? 0));
          const sellValueOfCosted = roundMoney(Number(row?.sellValueOfCosted ?? 0));
          const unrealizedProfit = roundMoney(sellValueOfCosted - costBasis);
          return {
            currency,
            cardCount: Number(row?.cardCount ?? 0),
            costedCount: Number(row?.costedCount ?? 0),
            costBasis,
            sellValue: roundMoney(Number(row?.sellValue ?? 0)),
            sellValueOfCosted,
            unrealizedProfit,
            marginPercent: percentOf(unrealizedProfit, sellValueOfCosted),
          };
        },
      );
      return { success: true, data };
    }),
  );
