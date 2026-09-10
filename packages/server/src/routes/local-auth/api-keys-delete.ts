import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const deleteApiKeyRoute = new Hono<AppEnv>().delete(
  "/api-keys/:keyPrefix",
  requireAuth,
  async (c) => {
    try {
      await getOwnAuth().revokeApiKey({
        keyPrefix: c.req.param("keyPrefix"),
        actorUserId: c.get("userId"),
      });
      return c.json({ success: true, data: null });
    } catch (err) {
      const { message, status } = authErrorResponse(err);
      return c.json({ success: false, message }, status);
    }
  },
);
