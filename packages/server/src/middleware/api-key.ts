import { API_KEY_PREFIX } from "@magic-vault/shared";
import { createMiddleware } from "hono/factory";
import { hashApiKey, resolveApiKey } from "../lib/api-keys";
import { API_ACCESS_UPGRADE_MESSAGE } from "../lib/constants/api-keys";
import type { ApiKeyEnv } from "../lib/interfaces/api-keys";
import { consumeRateLimit } from "../lib/public-api/rate-limit";

export const requireApiKey = createMiddleware<ApiKeyEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(API_KEY_PREFIX)) {
    return c.json(
      { success: false, message: "Missing or invalid API key." },
      401,
    );
  }
  const keyHash = hashApiKey(token);
  const rate = consumeRateLimit(keyHash);
  const resetSeconds = Math.max(
    Math.ceil((rate.resetAt - Date.now()) / 1000),
    0,
  );
  c.header("X-RateLimit-Limit", String(rate.limit));
  c.header("X-RateLimit-Remaining", String(rate.remaining));
  c.header("X-RateLimit-Reset", String(resetSeconds));
  if (!rate.allowed) {
    c.header("Retry-After", String(resetSeconds));
    return c.json(
      { success: false, message: "Too many requests. Slow down and retry." },
      429,
    );
  }
  const key = await resolveApiKey(keyHash);
  if (!key) {
    return c.json(
      { success: false, message: "Missing or invalid API key." },
      401,
    );
  }
  if (!key.apiAccessAllowed) {
    return c.json({ success: false, message: API_ACCESS_UPGRADE_MESSAGE }, 403);
  }
  c.set("orgId", key.orgId);
  c.set("apiKeyGuid", key.guid);
  c.set("apiKeyScope", key.scope);
  await next();
});
