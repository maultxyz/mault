import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { authProvider } from "../../auth";
import { authQuery } from "../../db";
import { collections } from "../../db/schema";
import { getLocksForGuids, subscribeOrgLocks } from "../../lib/scan-lock";
import { verifyToken, type AppEnv } from "../../middleware/auth";

// GET /collections/lock-events — SSE stream of lock_acquired / lock_released for all org collections
export const lockEventsRoute = new Hono<AppEnv>().get("/lock-events", async (c) => {
  const token = c.req.query("token");
  const orgId = c.req.query("orgId");

  if (!token || !orgId)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
  if (!member) return c.json({ success: false, message: "Forbidden" }, 403);

  const jwtClaims = JSON.stringify({ sub: payload.sub, role: "authenticated" });

  return streamSSE(c, async (stream) => {
    const aborted = new Promise<void>((resolve) => stream.onAbort(resolve));

    const unsubscribe = subscribeOrgLocks(orgId, (event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    try {
      const guids = await authQuery(jwtClaims, async (tx) =>
        tx
          .select({ guid: collections.guid })
          .from(collections)
          .where(eq(collections.orgId, orgId)),
      );
      const initial = getLocksForGuids(
        guids.map((r) => r.guid!).filter(Boolean),
      );
      await stream.writeSSE({
        event: "init",
        data: JSON.stringify({ locks: initial }),
      });
    } catch {}

    await aborted;
    unsubscribe();
  });
});
