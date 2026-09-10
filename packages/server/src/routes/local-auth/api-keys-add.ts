import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const addApiKeyRoute = new Hono<AppEnv>().post("/api-keys", requireAuth, async (c) => {
  const { name, expiresAt } = await c.req.json<{
    name?: string;
    expiresAt?: string;
  }>();
  if (!name) {
    return c.json({ success: false, message: "Name is required." }, 400);
  }
  try {
    const { apiKey, rawKey } = await getOwnAuth().createApiKey({
      name,
      actorUserId: c.get("userId"),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    // rawKey is only ever returned here - own-auth stores just its hash.
    return c.json({ success: true, data: { apiKey, rawKey } });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});
