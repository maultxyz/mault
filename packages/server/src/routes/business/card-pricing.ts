import {
  cardCostRequestSchema,
  cardSellPriceRequestSchema,
  spreadTotal,
  type CardPricesUpdateResult,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { collectionCards, intakeLots } from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { scannedCardPriceSql } from "../../lib/card-price-sql";
import { loadCardPricing } from "../../lib/card-pricing";
import {
  BUSINESS_FORBIDDEN_RESULT,
  BUSINESS_UPGRADE_REQUIRED_RESULT,
} from "../../lib/constants/business";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { loadOrgPricing } from "../../lib/price-source";
import { uuidArraySql } from "../../lib/sql-arrays";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { businessQuery, notFound, pricingCurrency, updateAcquisitionCosts } from "./shared";

export const cardPricingRoute = new Hono<AppEnv>()
  .get("/cards/:scanId/pricing", requireAuth, requireOrg, (c) => {
    const scanId = c.req.param("scanId");
    if (!UUID_PATTERN.test(scanId)) {
      return c.json({ success: false, message: "Invalid card." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      const data = await loadCardPricing(tx, c.get("orgId"), scanId, access.canViewCosts);
      return data ? { success: true, data } : notFound("Card not found.");
    });
  })
  .put("/cards/sell-price", requireAuth, requireOrg, async (c) => {
    const parsed = cardSellPriceRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ success: false, message: "Invalid request." }, 400);
    }
    const request = parsed.data;
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canManageSettings) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const currency = pricingCurrency(await loadOrgPricing(tx, orgId));
      const values =
        request.mode === "default"
          ? { sellMarkupPercent: null, sellPriceFixed: null, sellPriceCurrency: null }
          : request.mode === "markup"
            ? {
                sellMarkupPercent: request.markupPercent,
                sellPriceFixed: null,
                sellPriceCurrency: null,
              }
            : {
                sellMarkupPercent: null,
                sellPriceFixed: request.fixedPrice,
                sellPriceCurrency: currency,
              };
      const updated = await tx
        .update(collectionCards)
        .set(values)
        .where(
          and(
            eq(collectionCards.orgId, orgId),
            sql`${collectionCards.guid} = ANY(${uuidArraySql(request.scanIds)})`,
          ),
        )
        .returning({ guid: collectionCards.guid });
      if (updated.length > 0) {
        await logActivity(tx, {
          orgId,
          userId: c.get("userId"),
          action: "cards.sellPriceSet",
          summary:
            request.mode === "default"
              ? "default"
              : request.mode === "markup"
                ? `${request.markupPercent}%`
                : `${request.fixedPrice} ${currency}`,
          details: { count: updated.length, mode: request.mode },
        });
      }
      const data: CardPricesUpdateResult = { updated: updated.length };
      return { success: true, data };
    });
  })
  .put("/cards/cost", requireAuth, requireOrg, async (c) => {
    const parsed = cardCostRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ success: false, message: "Invalid request." }, 400);
    }
    const request = parsed.data;
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canViewCosts) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const pricing = await loadOrgPricing(tx, orgId);
      const currency = pricingCurrency(pricing);
      const cards = await tx
        .select({
          scanId: collectionCards.guid,
          price: scannedCardPriceSql(pricing),
        })
        .from(collectionCards)
        .leftJoin(intakeLots, eq(intakeLots.id, collectionCards.intakeLotId))
        .where(
          and(
            eq(collectionCards.orgId, orgId),
            sql`${collectionCards.guid} = ANY(${uuidArraySql(request.scanIds)})`,
            sql`(${intakeLots.id} IS NULL OR ${intakeLots.status} = 'accepted')`,
          ),
        );
      const costs =
        request.mode === "each"
          ? cards.map(() => request.amount)
          : spreadTotal(
              cards.map((card) => (card.price == null ? 0 : Number(card.price))),
              request.amount,
            );
      await updateAcquisitionCosts(tx, {
        orgId,
        currency,
        acquiredAt: new Date(),
        rows: cards.map((card, index) => ({ scanId: card.scanId!, cost: costs[index] ?? 0 })),
      });
      if (cards.length > 0) {
        await logActivity(tx, {
          orgId,
          userId: c.get("userId"),
          action: "cost.set",
          summary: `${request.amount} ${currency}`,
          details: { count: cards.length, mode: request.mode, amount: request.amount, currency },
        });
      }
      const data: CardPricesUpdateResult = { updated: cards.length };
      return { success: true, data };
    });
  });
