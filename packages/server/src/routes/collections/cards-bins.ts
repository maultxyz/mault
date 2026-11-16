import type { BinCardCount, BinWindow } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { authQuery, type Transaction } from "../../db";
import {
  COLLECTION_BIN_COUNTS_CACHE_MAX_ENTRIES,
  COLLECTION_BIN_COUNTS_CACHE_TTL_MS,
} from "../../lib/constants/collection-read-caches";
import type { CardsCollection } from "../../lib/interfaces/collections";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findCardsCollection,
  loadBinContents,
  loadBinCounts,
  parseBinWindows,
} from "./cards-query";

const binCountsCache = createOrgReadCache<BinCardCount[] | null>(
  COLLECTION_BIN_COUNTS_CACHE_TTL_MS,
  COLLECTION_BIN_COUNTS_CACHE_MAX_ENTRIES,
);

function binsHandler<T>(
  load: (
    tx: Transaction,
    collection: CardsCollection,
    bins: BinWindow[],
  ) => Promise<T>,
) {
  return async (c: Context<AppEnv>) => {
    const bins = parseBinWindows(c.req.query("bins"));
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(
        tx,
        c.req.param("guid")!,
        c.get("orgId"),
      );
      if (!collection)
        return { success: false, message: "Collection not found." };
      return { success: true, data: await load(tx, collection, bins) };
    });
    return c.json(result);
  };
}

export const collectionCardBinsRoute = new Hono<AppEnv>()
  .get("/:guid/cards/bin-counts", requireAuth, requireOrg, async (c) => {
    const collectionGuid = c.req.param("guid");
    const orgId = c.get("orgId");
    const bins = parseBinWindows(c.req.query("bins"));
    const binNumbers = bins.map((bin) => bin.binNumber);
    const data = await binCountsCache.get(
      orgId,
      JSON.stringify([collectionGuid, binNumbers]),
      () =>
        authQuery(c.get("jwtClaims"), async (tx) => {
          const collection = await findCardsCollection(tx, collectionGuid, orgId);
          if (!collection) return null;
          return loadBinCounts(tx, collection.id, bins);
        }),
    );
    if (!data) return c.json({ success: false, message: "Collection not found." });
    return c.json({ success: true, data });
  })
  .get(
    "/:guid/cards/bin-contents",
    requireAuth,
    requireOrg,
    binsHandler(loadBinContents),
  );
