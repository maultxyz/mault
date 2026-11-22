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
      intakeOffer: collectionCards.intakeOffer,
      intakeOfferCurrency: collectionCards.intakeOfferCurrency,
      intakeLotStatus: intakeLots.status,
      acquiredAt: collectionCards.acquiredAt,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(intakeLots, eq(intakeLots.id, collectionCards.intakeLotId))
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
      const isOpenIntake = card.intakeLotStatus === "open";
      const shownCost = isOpenIntake ? card.intakeOffer : card.cost;
      const shownCurrency = isOpenIntake ? card.intakeOfferCurrency : card.currency;
      const currency =
        shownCost !== null && shownCurrency
          ? shownCurrency
          : pricingCurrency(await loadOrgPricing(tx, orgId));
      const data: CardAcquisitionCost = { cost: shownCost, currency };
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
      if (card.intakeLotStatus === "open") {
        await tx
          .update(collectionCards)
          .set({ intakeOffer: cost, intakeOfferCurrency: cost === null ? null : currency })
          .where(and(eq(collectionCards.guid, scanId), eq(collectionCards.orgId, orgId)));
      } else {
        await updateAcquisitionCosts(tx, {
          orgId,
          currency,
          acquiredAt: card.acquiredAt ?? new Date(),
          rows: [{ scanId, cost }],
        });
      }
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
;
