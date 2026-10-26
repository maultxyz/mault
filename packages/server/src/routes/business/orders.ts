import {
  ORDER_NAME_MAX_LENGTH,
  ORDER_SOURCES,
  type FulfilmentOrder,
  type FulfilmentOrderDetail,
  type PagedList,
  type FulfilmentOrderInput,
  type OrderFulfilInput,
  type OrderSource,
} from "@magic-vault/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../../db";
import { cardSales, fulfilmentOrders } from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { UUID_PATTERN } from "../../lib/constants/validation";
import type { SoldCardRow } from "../../lib/interfaces/business";
import {
  allocateOrderLines,
  loadPullSheet,
  normalizeOrderLines,
  orderCreatorName,
  summarizeOrder,
  toOrderLines,
} from "../../lib/orders";
import { parsePageParams, resolvePageWindow } from "../../lib/paging";
import { loadOrgPricing } from "../../lib/price-source";
import { deleteScanImages } from "../../lib/scan-images";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  businessQuery,
  cleanText,
  notFound,
  pricingCurrency,
  readJson,
} from "./shared";
import {
  BUSINESS_FORBIDDEN_RESULT,
  BUSINESS_UPGRADE_REQUIRED_RESULT,
  PICK_NOT_FOUND_MESSAGE,
} from "../../lib/constants/business";

async function findOrder(tx: Transaction, orgId: string, guid: string) {
  if (!UUID_PATTERN.test(guid)) return null;
  const row = await tx.query.fulfilmentOrders.findFirst({
    where: and(
      eq(fulfilmentOrders.guid, guid),
      eq(fulfilmentOrders.orgId, orgId),
      eq(fulfilmentOrders.isDeleted, false),
    ),
  });
  return row ?? null;
}

export const ordersRoute = new Hono<AppEnv>()
  .get("/orders", requireAuth, requireOrg, (c) => {
    const params = parsePageParams(c);
    return businessQuery(c, async (tx, access) => {
      const scope = and(
        eq(fulfilmentOrders.orgId, c.get("orgId")),
        eq(fulfilmentOrders.isDeleted, false),
      );
      const ordered = await tx
        .select({ guid: fulfilmentOrders.guid })
        .from(fulfilmentOrders)
        .where(scope)
        .orderBy(desc(fulfilmentOrders.createdAt), desc(fulfilmentOrders.id));
      const window = resolvePageWindow(
        params,
        ordered.map((row) => row.guid),
      );
      const rows = window.guids.length
        ? await tx
            .select()
            .from(fulfilmentOrders)
            .where(and(scope, inArray(fulfilmentOrders.guid, window.guids)))
        : [];
      rows.sort(
        (a, b) => window.guids.indexOf(a.guid!) - window.guids.indexOf(b.guid!),
      );
      const items = [];
      for (const row of rows) {
        items.push(
          summarizeOrder(
            row,
            toOrderLines(row.lines),
            await orderCreatorName(row.createdByUserId),
            access.canViewCosts,
          ),
        );
      }
      const data: PagedList<FulfilmentOrder> = {
        items,
        total: window.total,
        page: window.page,
        pageSize: window.pageSize,
      };
      return { success: true, data };
    });
  })
  .post("/orders", requireAuth, requireOrg, async (c) => {
    const body = await readJson<FulfilmentOrderInput>(c);
    const name = cleanText(body.name, ORDER_NAME_MAX_LENGTH);
    const lines = normalizeOrderLines(body.lines);
    const source: OrderSource = ORDER_SOURCES.includes(
      body.source as OrderSource,
    )
      ? (body.source as OrderSource)
      : "generic";
    if (!name || !lines) {
      return c.json({ success: false, message: "Invalid pick." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const allocated = await allocateOrderLines(tx, orgId, null, lines);
      const [created] = await tx
        .insert(fulfilmentOrders)
        .values({
          orgId,
          name,
          source,
          lines: allocated,
          createdByUserId: c.get("userId"),
        })
        .returning({ guid: fulfilmentOrders.guid });
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "order.created",
        summary: name,
        details: {
          orderGuid: created.guid,
          lines: lines.length,
          quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
        },
      });
      return { success: true, data: { guid: created.guid } };
    });
  })
  .get("/orders/:guid", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      const orgId = c.get("orgId");
      const row = await findOrder(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(PICK_NOT_FOUND_MESSAGE);
      const lines = toOrderLines(row.lines);
      const pullSheet =
        row.status === "open" ? await loadPullSheet(tx, orgId, lines) : [];
      const live = new Set(pullSheet.map((entry) => entry.scanId));
      const visibleLines =
        row.status === "open"
          ? lines.map((line) => ({
              ...line,
              allocations: line.allocations.filter((id) => live.has(id)),
              picked: line.picked.filter((id) => live.has(id)),
            }))
          : lines;
      const data: FulfilmentOrderDetail = {
        ...summarizeOrder(
          row,
          visibleLines,
          await orderCreatorName(row.createdByUserId),
          access.canViewCosts,
        ),
        lines: access.canViewCosts
          ? visibleLines
          : visibleLines.map((line) => ({ ...line, unitPrice: null })),
        pullSheet,
      };
      return { success: true, data };
    }),
  )
  .post("/orders/:guid/allocate", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const row = await findOrder(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(PICK_NOT_FOUND_MESSAGE);
      if (row.status !== "open") {
        return { success: false, message: "This pick is closed." };
      }
      const lines = await allocateOrderLines(
        tx,
        orgId,
        row.id,
        toOrderLines(row.lines),
      );
      await tx
        .update(fulfilmentOrders)
        .set({ lines, updatedAt: new Date() })
        .where(eq(fulfilmentOrders.id, row.id));
      return { success: true, data: null };
    }),
  )
  .post("/orders/:guid/fulfil", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const body = await readJson<OrderFulfilInput>(c);
    const requested = new Set(
      Array.isArray(body.scanIds)
        ? body.scanIds.filter(
            (id): id is string =>
              typeof id === "string" && UUID_PATTERN.test(id),
          )
        : [],
    );
    if (requested.size === 0) {
      return c.json({ success: false, message: "Pick at least one card." }, 400);
    }
    const removedByCollection = new Map<string, string[]>();
    const imageKeys: (string | null)[] = [];
    let committed = false;
    const response = await businessQuery(c, async (tx, access) => {
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const row = await findOrder(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(PICK_NOT_FOUND_MESSAGE);
      if (row.status !== "open") {
        return { success: false, message: "This pick is closed." };
      }
      const lines = toOrderLines(row.lines).map((line) => ({
        ...line,
        picked: line.allocations.filter((id) => requested.has(id)),
      }));
      const lineOf = new Map<string, number>();
      lines.forEach((line, index) => {
        for (const id of line.picked) lineOf.set(id, index);
      });
      if (lineOf.size === 0) {
        return {
          success: false,
          message: "None of the picked cards belong to this pick.",
        };
      }
      const currency = pricingCurrency(await loadOrgPricing(tx, orgId));
      const ids = [...lineOf.keys()];
      const sold = ids.length
        ? ((
            await tx.execute(sql`
              DELETE FROM collection_cards cc
              USING collections col
              WHERE col.id = cc.collection_id
                AND cc.org_id = ${orgId}
                AND cc.guid::text = ANY(string_to_array(${ids.join(",")}, ','))
              RETURNING cc.guid::text AS scan_id, cc.card_id,
                cc.card ->> 'name' AS name,
                cc.card ->> 'set' AS set_code,
                cc.card ->> 'collectorNumber' AS collector_number,
                cc.is_foil, cc.condition, cc.acquisition_cost,
                cc.acquisition_currency, cc.captured_image_key AS image_key,
                col.guid::text AS collection_guid, col.name AS collection_name
            `)
          ).rows as unknown as SoldCardRow[])
        : [];
      const now = new Date();
      if (sold.length > 0) {
        await tx.insert(cardSales).values(
          sold.map((card) => ({
            orgId,
            orderId: row.id,
            scanId: card.scan_id,
            cardId: card.card_id,
            cardName: card.name,
            setCode: card.set_code,
            collectorNumber: card.collector_number,
            isFoil: card.is_foil,
            condition: card.condition,
            salePrice: lines[lineOf.get(card.scan_id) ?? 0]?.unitPrice ?? null,
            acquisitionCost:
              card.acquisition_currency === currency
                ? card.acquisition_cost
                : null,
            currency,
            collectionName: card.collection_name,
            soldByUserId: c.get("userId"),
            soldAt: now,
          })),
        );
      }
      for (const card of sold) {
        imageKeys.push(card.image_key);
        const list = removedByCollection.get(card.collection_guid) ?? [];
        list.push(card.scan_id);
        removedByCollection.set(card.collection_guid, list);
      }
      await tx
        .update(fulfilmentOrders)
        .set({
          status: "fulfilled",
          lines,
          closedAt: now,
          closedByUserId: c.get("userId"),
          updatedAt: now,
        })
        .where(eq(fulfilmentOrders.id, row.id));
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "order.fulfilled",
        summary: row.name,
        details: { orderGuid: row.guid, sold: sold.length },
      });
      committed = true;
      return { success: true, data: { sold: sold.length } };
    });
    if (!committed || response.status !== 200) return response;
    deleteScanImages(imageKeys);
    for (const [collectionGuid, scanIds] of removedByCollection) {
      emitToSession(collectionGuid, "cards_removed", { scanIds });
      emitToOrg(orgId, "collections_changed", { guid: collectionGuid });
    }
    return response;
  })
  .post("/orders/:guid/cancel", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const row = await findOrder(tx, orgId, c.req.param("guid"));
      if (!row) return notFound(PICK_NOT_FOUND_MESSAGE);
      if (row.status !== "open") {
        return { success: false, message: "This pick is closed." };
      }
      const now = new Date();
      await tx
        .update(fulfilmentOrders)
        .set({
          status: "cancelled",
          closedAt: now,
          closedByUserId: c.get("userId"),
          updatedAt: now,
        })
        .where(eq(fulfilmentOrders.id, row.id));
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "order.cancelled",
        summary: row.name,
        details: { orderGuid: row.guid },
      });
      return { success: true, data: null };
    }),
  )
  .delete("/orders/:guid", requireAuth, requireOrg, (c) =>
    businessQuery(c, async (tx, access) => {
      if (!access.canFulfilOrders) return BUSINESS_FORBIDDEN_RESULT;
      const row = await findOrder(tx, c.get("orgId"), c.req.param("guid"));
      if (!row) return notFound(PICK_NOT_FOUND_MESSAGE);
      if (row.status === "open") {
        return {
          success: false,
          message: "Complete or cancel the pick before deleting it.",
        };
      }
      await tx
        .update(fulfilmentOrders)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(fulfilmentOrders.id, row.id));
      return { success: true, data: null };
    }),
  );
