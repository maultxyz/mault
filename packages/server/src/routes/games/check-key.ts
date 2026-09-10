import { Hono } from "hono";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { keyIsTaken } from "./shared";

export const checkKeyRoute = new Hono<AppEnv>().get(
  "/check-key",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const key = c.req.query("key")?.trim();
    const excludeGuid = c.req.query("excludeGuid") || undefined;
    if (!key) {
      return c.json({ success: false, message: "key is required." }, 400);
    }

    try {
      const taken = await keyIsTaken(key, excludeGuid);
      return c.json({ success: true, data: { available: !taken } });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
