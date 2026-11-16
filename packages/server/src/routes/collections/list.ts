import type { Collection } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  COLLECTIONS_LIST_CACHE_MAX_ENTRIES,
  COLLECTIONS_LIST_CACHE_TTL_MS,
} from "../../lib/constants/collection-read-caches";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadCollections } from "./shared";

const collectionsListCache = createOrgReadCache<{ success: true; data: Collection[] }>(
  COLLECTIONS_LIST_CACHE_TTL_MS,
  COLLECTIONS_LIST_CACHE_MAX_ENTRIES,
);

export const listCollectionsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const result = await collectionsListCache.get(orgId, "all", () =>
      authQuery(c.get("jwtClaims"), (tx) => loadCollections(tx, orgId)),
    );
    return c.json(result);
  },
);
