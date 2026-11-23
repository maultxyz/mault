import {
  ADMIN_CACHE_KEYS_PAGE_MAX,
  ADMIN_CACHE_KEY_SEARCH_MAX_LENGTH,
  adminCacheOrgIdSchema,
  adminClearCacheEntriesRequestSchema,
  type AdminCacheKeysPage,
  type AdminCacheSummary,
  type AdminClearCacheEntriesResult,
  type AdminClearCachesResult,
} from "@magic-vault/shared";
import { Hono } from "hono";
import {
  clearRegisteredCache,
  clearRegisteredCaches,
  deleteKeysContainingFromEveryCache,
  deleteRegisteredCacheKeys,
  listRegisteredCacheKeys,
  listRegisteredCaches,
} from "../../lib/cache-registry";
import { invalidateCardMatchIndex } from "../../lib/card-match-index";
import { invalidateMemberSeats } from "../../lib/member-seat-limit";
import { refreshPlanConfig } from "../../lib/plan-config";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

const cacheNotFound = { success: false, message: "Cache not found." } as const;

export const cachesRoute = new Hono<AppEnv>()
  .get("/caches", requireAuth, requireRole("admin"), (c) => {
    const data: AdminCacheSummary[] = listRegisteredCaches();
    return c.json({ success: true, data });
  })
  .get("/caches/:name/keys", requireAuth, requireRole("admin"), (c) => {
    const keyContains = (c.req.query("q") ?? "").slice(0, ADMIN_CACHE_KEY_SEARCH_MAX_LENGTH);
    const data: AdminCacheKeysPage | null = listRegisteredCacheKeys(
      c.req.param("name"),
      keyContains,
      ADMIN_CACHE_KEYS_PAGE_MAX,
    );
    if (!data) return c.json(cacheNotFound, 404);
    return c.json({ success: true, data });
  })
  .post("/caches/clear", requireAuth, requireRole("admin"), async (c) => {
    const data: AdminClearCachesResult = { clearedCacheCount: clearRegisteredCaches() };
    await refreshPlanConfig();
    return c.json({ success: true, data });
  })
  .post("/caches/orgs/:orgId/clear", requireAuth, requireRole("admin"), (c) => {
    const orgId = adminCacheOrgIdSchema.safeParse(c.req.param("orgId"));
    if (!orgId.success) {
      return c.json({ success: false, message: "Invalid organization id." }, 400);
    }
    invalidateMemberSeats(orgId.data);
    const data: AdminClearCacheEntriesResult = {
      clearedEntryCount: deleteKeysContainingFromEveryCache(orgId.data),
    };
    return c.json({ success: true, data });
  })
  .post("/caches/card-match-index/reload", requireAuth, requireRole("admin"), (c) => {
    invalidateCardMatchIndex();
    return c.json({ success: true });
  })
  .post("/caches/:name/clear", requireAuth, requireRole("admin"), async (c) => {
    const input = adminClearCacheEntriesRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!input.success) {
      return c.json({ success: false, message: "Invalid cache clear request." }, 400);
    }
    const name = c.req.param("name");
    let clearedEntryCount: number | null;
    if ("keys" in input.data) {
      const keys = new Set(input.data.keys);
      clearedEntryCount = deleteRegisteredCacheKeys(name, (key) => keys.has(key));
    } else if ("keyContains" in input.data) {
      const { keyContains } = input.data;
      clearedEntryCount = deleteRegisteredCacheKeys(name, (key) => key.includes(keyContains));
    } else {
      clearedEntryCount = clearRegisteredCache(name);
    }
    if (clearedEntryCount === null) return c.json(cacheNotFound, 404);
    const data: AdminClearCacheEntriesResult = { clearedEntryCount };
    return c.json({ success: true, data });
  });
