import { Hono } from "hono";
import {
  PI_CAMERA_ACTIONS,
  PI_CAMERA_HELPER_URL,
} from "../lib/constants/pi-camera";
import { isPiHost } from "../lib/pi-host";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

export const piCameraRouter = new Hono<AppEnv>()
  .use("*", async (c, next) => (isPiHost() ? next() : c.notFound()))
  .use("*", requireAuth, requireOrg)
  .all("/:action", async (c) => {
    const action = c.req.param("action");
    if (!Object.prototype.hasOwnProperty.call(PI_CAMERA_ACTIONS, action))
      return c.notFound();
    const method = PI_CAMERA_ACTIONS[action as keyof typeof PI_CAMERA_ACTIONS];
    if (c.req.method !== method) return c.text("Method not allowed", 405);
    try {
      const upstream = await fetch(`${PI_CAMERA_HELPER_URL}/${action}`, {
        method,
        headers:
          method === "POST"
            ? { "Content-Type": "application/json" }
            : undefined,
        body: method === "POST" ? await c.req.text() : undefined,
        signal: c.req.raw.signal,
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") ?? "application/octet-stream",
          "Cache-Control": "no-store",
          "X-Accel-Buffering": "no",
        },
      });
    } catch {
      return c.text("Camera is unavailable", 503);
    }
  });
