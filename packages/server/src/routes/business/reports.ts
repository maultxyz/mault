import {
  spreadTotal,
  type CardAcquisitionCost,
  type CardAcquisitionCostInput,
  type CollectionCostInput,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { collectionCards, collections, intakeLots } from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { scannedCardPriceSql } from "../../lib/card-price-sql";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { loadOrgPricing } from "../../lib/price-source";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import type { Transaction } from "../../db";
import {
  businessQuery,
  notFound,
  pricingCurrency,
  readJson,
  toMoney,
  updateAcquisitionCosts,
} from "./shared";
import {
  BUSINESS_FORBIDDEN_RESULT,
  BUSINESS_UPGRADE_REQUIRED_RESULT,
} from "../../lib/constants/business";

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function findCostCard(tx: Transaction, orgId: string, scanId: string) {
  const [card] = await tx
    .select({
      name: sql<string>`${collectionCards.card} ->> 'name'`,
      cost: collectionCards.acquisitionCost,
      currency: collectionCards.acquisitionCurrency,
      acquiredAt: collectionCards.acquiredAt,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(
      and(
        eq(collectionCards.guid, scanId),
        eq(collectionCards.orgId, orgId),
        eq(collections.isDeleted, false),
      ),
    );
  return card;
}

export const reportsRoute = new Hono<AppEnv>()
  .get("/cost/cards/:scanId", requireAuth, requireOrg, async (c) => {
    const scanId = c.req.param("scanId");
    if (!UUID_PATTERN.test(scanId)) {
      return c.json({ success: false, message: "Invalid card." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canViewCosts) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const card = await findCostCard(tx, orgId, scanId);
      if (!card) return notFound("Card not found.");
      const currency =
        card.cost !== null && card.currency
          ? card.currency
          : pricingCurrency(await loadOrgPricing(tx, orgId));
      const data: CardAcquisitionCost = { cost: card.cost, currency };
      return { success: true, data };
    });
  })
  .put("/cost/cards/:scanId", requireAuth, requireOrg, async (c) => {
    const scanId = c.req.param("scanId");
    const body = await readJson<CardAcquisitionCostInput>(c);
    const cost = body.cost === null ? null : toMoney(body.cost);
    if (!UUID_PATTERN.test(scanId) || (body.cost !== null && cost === null)) {
      return c.json({ success: false, message: "Invalid cost." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canViewCosts) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const card = await findCostCard(tx, orgId, scanId);
      if (!card) return notFound("Card not found.");
      const currency = pricingCurrency(await loadOrgPricing(tx, orgId));
      await updateAcquisitionCosts(tx, {
        orgId,
        currency,
        acquiredAt: card.acquiredAt ?? new Date(),
        rows: [{ scanId, cost }],
      });
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "cost.set",
        summary: card.name,
        details: { scanId, cost, currency },
      });
      const data: CardAcquisitionCost = { cost, currency };
      return { success: true, data };
    });
  })
  .post("/cost/:collectionGuid", requireAuth, requireOrg, async (c) => {
    const collectionGuid = c.req.param("collectionGuid");
    const body = await readJson<CollectionCostInput>(c);
    const total = toMoney(body.total);
    if (
      !UUID_PATTERN.test(collectionGuid) ||
      total === null ||
      (body.mode !== "spread" && body.mode !== "each")
    ) {
      return c.json({ success: false, message: "Invalid cost." }, 400);
    }
    return businessQuery(c, async (tx, access) => {
      if (access.isLocked) return BUSINESS_UPGRADE_REQUIRED_RESULT;
      if (!access.canViewCosts) return BUSINESS_FORBIDDEN_RESULT;
      const orgId = c.get("orgId");
      const collection = await tx.query.collections.findFirst({
        where: and(
          eq(collections.guid, collectionGuid),
          eq(collections.orgId, orgId),
          eq(collections.isDeleted, false),
        ),
        columns: { id: true, name: true },
      });
      if (!collection) return notFound("Collection not found.");
      const pricing = await loadOrgPricing(tx, orgId);
      const currency = pricingCurrency(pricing);
      const cards = await tx
        .select({
          scanId: collectionCards.guid,
          price: scannedCardPriceSql(pricing),
          cost: collectionCards.acquisitionCost,
        })
        .from(collectionCards)
        .leftJoin(intakeLots, eq(intakeLots.id, collectionCards.intakeLotId))
        .where(
          and(
            eq(collectionCards.collectionId, collection.id),
            sql`(${intakeLots.id} IS NULL OR ${intakeLots.status} = 'accepted')`,
          ),
        );
      const targets = body.overwrite
        ? cards
        : cards.filter((card) => card.cost === null);
      const costs =
        body.mode === "each"
          ? targets.map(() => total)
          : spreadTotal(
              targets.map((card) => Number(card.price ?? 0)),
              total,
            );
      await updateAcquisitionCosts(tx, {
        orgId,
        currency,
        acquiredAt: new Date(),
        rows: targets.map((card, i) => ({
          scanId: card.scanId!,
          cost: costs[i],
        })),
      });
      await logActivity(tx, {
        orgId,
        userId: c.get("userId"),
        action: "cost.set",
        summary: collection.name,
        details: {
          collectionGuid,
          mode: body.mode,
          total,
          currency,
          cards: targets.length,
        },
      });
      return {
        success: true,
        data: { updated: targets.length, skipped: cards.length - targets.length },
      };
    });
  });
