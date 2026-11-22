import type { AdminClearCachesResult } from "@magic-vault/shared";
import { Hono } from "hono";
import { clearRegisteredCaches } from "../../lib/cache-registry";
import { invalidateCardMatchIndex } from "../../lib/card-match-index";
import { refreshPlanConfig } from "../../lib/plan-config";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const cachesRoute = new Hono<AppEnv>()
  .post("/caches/clear", requireAuth, requireRole("admin"), async (c) => {
    const data: AdminClearCachesResult = { clearedCacheCount: clearRegisteredCaches() };
    await refreshPlanConfig();
    return c.json({ success: true, data });
  })
  .post("/caches/card-match-index/reload", requireAuth, requireRole("admin"), (c) => {
    invalidateCardMatchIndex();
    return c.json({ success: true });
  });
