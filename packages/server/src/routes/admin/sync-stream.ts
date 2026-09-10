import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { subscribeSSE } from "../../lib/sync-job";
import { verifyToken, type AppEnv } from "../../middleware/auth";

// GET /admin/sync/stream — SSE, auth via ?token= query param (must be before GET /admin/sync)
export const syncStreamRoute = new Hono<AppEnv>().get("/sync/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);

  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribeSSE((event, data) => {
      stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => {});
    });

    await new Promise<void>((resolve) => {
      stream.onAbort(resolve);
    });

    unsubscribe();
  });
});
