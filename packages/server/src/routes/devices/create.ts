import { Hono } from "hono";
import { authQuery } from "../../db";
import { devices } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toDevice } from "./shared";

export const createDeviceRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req
      .json<{ name?: string }>()
      .catch(() => ({ name: undefined }));
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [inserted] = await tx
          .insert(devices)
          .values({ orgId, ...(body.name ? { name: body.name } : {}) })
          .returning();
        return {
          success: true,
          message: "Created device.",
          data: toDevice(inserted),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
