import type { Collection } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  COLLECTIONS_LIST_CACHE_MAX_ENTRIES,
  COLLECTIONS_LIST_CACHE_TTL_MS,
} from "../../lib/constants/collection-read-caches";
import { loadStoredCollectionCardCounts } from "../../lib/collection-card-stats";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadCollections } from "./shared";

const collectionsListCache = createOrgReadCache<{ success: true; data: Collection[] }>(
  "org.collectionsList",
  COLLECTIONS_LIST_CACHE_TTL_MS,
  COLLECTIONS_LIST_CACHE_MAX_ENTRIES,
);

export const listCollectionsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const result = await collectionsListCache.get(orgId, "all", async () => {
      const storedCardCounts = await loadStoredCollectionCardCounts(orgId);
      return authQuery(c.get("jwtClaims"), (tx) =>
        loadCollections(tx, orgId, storedCardCounts),
      );
    });
    return c.json(result);
  },
);
