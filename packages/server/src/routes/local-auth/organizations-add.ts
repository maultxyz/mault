import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const addOrganizationRoute = new Hono<AppEnv>().post(
  "/organizations",
  requireAuth,
  async (c) => {
    const { name } = await c.req.json<{ name?: string }>();
    if (!name) {
      return c.json({ success: false, message: "Name is required." }, 400);
    }
    try {
      const { organisation } = await getOwnAuth().createOrganisation({
        name,
        ownerUserId: c.get("userId"),
      });
      return c.json({ success: true, data: organisation });
    } catch (err) {
      const { message, status } = authErrorResponse(err);
      return c.json({ success: false, message }, status);
    }
  },
);
