import { Hono } from "hono";
import { authQuery } from "../../db";
import {
  BIN_SET_LIST_CACHE_MAX_ENTRIES,
  BIN_SET_LIST_CACHE_TTL_MS,
} from "../../lib/constants/bin-sets";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

const binSetListCache = createOrgReadCache<Awaited<ReturnType<typeof loadSets>>>(
  BIN_SET_LIST_CACHE_TTL_MS,
  BIN_SET_LIST_CACHE_MAX_ENTRIES,
);

export const listBinSetsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const jwtClaims = c.get("jwtClaims");
    const result = await binSetListCache.get(orgId, "all", () =>
      authQuery(jwtClaims, (tx) => loadSets(tx, orgId)),
    );
    return c.json(result);
  },
);
