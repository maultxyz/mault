import { API_KEY_PREFIX, PUBLIC_API_KEY_HEADER } from "@magic-vault/shared";
import { createMiddleware } from "hono/factory";
import { hashApiKey, resolveApiKey } from "../lib/api-keys";
import { API_ACCESS_UPGRADE_MESSAGE } from "../lib/constants/api-keys";
import type { ApiKeyEnv } from "../lib/interfaces/api-keys";
import { consumeRateLimit } from "../lib/public-api/rate-limit";
import { apiError } from "../lib/public-api/responses";

export const requireApiKey = createMiddleware<ApiKeyEnv>(async (c, next) => {
  const token = c.req.header(PUBLIC_API_KEY_HEADER)?.trim() ?? "";
  if (!token.startsWith(API_KEY_PREFIX)) {
    return apiError(c, 401, "unauthorized", "Missing or invalid API key.");
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
    return apiError(
      c,
      429,
      "rate_limited",
      "Too many requests. Slow down and retry.",
    );
  }
  const key = await resolveApiKey(keyHash);
  if (!key) {
    return apiError(c, 401, "unauthorized", "Missing or invalid API key.");
  }
  if (!key.apiAccessAllowed) {
    return apiError(c, 403, "forbidden", API_ACCESS_UPGRADE_MESSAGE);
  }
  c.set("orgId", key.orgId);
  c.set("apiKeyGuid", key.guid);
  c.set("apiKeyScope", key.scope);
  await next();
});
