import {
  STORAGE_CARDS_PAGE_SIZE,
  STORAGE_CARDS_PAGE_SIZE_MAX,
  type SharedStorageCardPage,
  type StorageShareLinkInfo,
} from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { db } from "../../db";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import type { StorageShareLinkClaims } from "../../lib/interfaces/share-tokens";
import { loadOrgPricing } from "../../lib/price-source";
import { pricesForShareLink } from "../../lib/share-link-pricing";
import { shareLinkRateLimit } from "../../lib/share-link-rate-limit";
import {
  sharedStorageReadsCache,
  sharedStorageReadsKey,
} from "../../lib/shared-storage-reads-cache";
import { verifyStorageShareLink } from "../../lib/storage-share-links";
import type { AppEnv } from "../../middleware/auth";
import { parseCardsQuery } from "../collections/cards-query";
import {
  loadLocationCardStats,
  loadLocationFieldDefinitions,
  loadStoredCardIdsPage,
  loadStoredCardsByRowIds,
  toStoredCards,
} from "../storage-locations/shared";

async function claimsFor(
  c: Context<AppEnv>,
): Promise<StorageShareLinkClaims | null> {
  const token = c.req.query("token");
  return token ? verifyStorageShareLink(token) : null;
}

export const publicStorageShareLinkRoute = new Hono<AppEnv>()
  .use("/storage-share-link", shareLinkRateLimit)
  .use("/storage-share-link/*", shareLinkRateLimit)
  .get("/storage-share-link", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json(
        { success: false, message: MONITOR_LINK_INVALID_MESSAGE },
        401,
      );
    }
    const cacheKey = sharedStorageReadsKey(
      claims.locationGuid,
      claims.showsPrices,
      "info",
      {},
    );
    const cachedInfo = sharedStorageReadsCache.get(cacheKey);
    if (cachedInfo) {
      return c.json({ success: true, message: "Valid share link.", data: cachedInfo });
    }
    const data = await db.transaction(async (tx) => {
      const pricing = await loadOrgPricing(tx, claims.orgId);
      const stats = await loadLocationCardStats(tx, claims.locationId, pricing);
      const info: StorageShareLinkInfo = {
        locationGuid: claims.locationGuid,
        locationName: claims.locationName,
        expiresAt: claims.expiresAt.toISOString(),
        cardCount: stats.totalCount,
        totalValue: claims.showsPrices ? stats.totalValue : 0,
        priceSource: pricing.source,
        conditionMultipliers: pricing.conditionMultipliers,
        showsPrices: claims.showsPrices,
      };
      return info;
    });
    sharedStorageReadsCache.set(cacheKey, data);
    return c.json({ success: true, message: "Valid share link.", data });
  })
  .get("/storage-share-link/cards", async (c) => {
    const claims = await claimsFor(c);
    if (!claims) {
      return c.json(
        { success: false, message: MONITOR_LINK_INVALID_MESSAGE },
        401,
      );
    }
    const pageSize = Math.min(
      Math.max(
        Number.parseInt(c.req.query("limit") ?? "", 10) ||
          STORAGE_CARDS_PAGE_SIZE,
        1,
      ),
      STORAGE_CARDS_PAGE_SIZE_MAX,
    );
    const requestedPage = Math.max(
      Number.parseInt(c.req.query("page") ?? "", 10) || 1,
      1,
    );
    const cacheKey = sharedStorageReadsKey(
      claims.locationGuid,
      claims.showsPrices,
      "cards",
      c.req.query(),
    );
    const cachedPage = sharedStorageReadsCache.get(cacheKey);
    if (cachedPage) return c.json({ success: true, data: cachedPage });
    const query = {
      ...parseCardsQuery(c.req.query()),
      grouped: false,
      unreviewed: false,
    };
    const data = await db.transaction(async (tx) => {
      const { rowIds, total, page } = await loadStoredCardIdsPage(
        tx,
        claims.locationId,
        query,
        query.sort
          ? await loadLocationFieldDefinitions(tx, claims.locationId)
          : [],
        pageSize,
        requestedPage,
      );
      const storedCards = await toStoredCards(
        await loadStoredCardsByRowIds(tx, rowIds),
        false,
      );
      const sharedPage: SharedStorageCardPage = {
        cards: storedCards.map((stored) => ({
          scanId: stored.scanId,
          position: stored.position,
          card: stored.card,
          isFoil: stored.isFoil,
          foilType: stored.foilType,
          stamp: stored.stamp,
          condition: stored.condition,
          language: stored.language,
        })),
        total,
        page,
        pageSize,
      };
      return pricesForShareLink(sharedPage, claims.showsPrices);
    });
    sharedStorageReadsCache.set(cacheKey, data);
    return c.json({ success: true, data });
  });
