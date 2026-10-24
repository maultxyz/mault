import {
  spreadTotal,
  type CollectionCostInput,
} from "@magic-vault/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { collectionCards, collections, intakeLots } from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { scannedCardPriceSql } from "../../lib/card-price-sql";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { loadOrgPricing } from "../../lib/price-source";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  businessQuery,
  forbidden,
  notFound,
  pricingCurrency,
  readJson,
  toMoney,
  updateAcquisitionCosts,
  upgradeRequired,
} from "./shared";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const reportsRoute = new Hono<AppEnv>()
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
      if (access.isLocked) return upgradeRequired;
      if (!access.canViewCosts) return forbidden;
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
