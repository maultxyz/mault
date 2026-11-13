import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import {
  PUBLIC_API_RATE_LIMIT_SWEEP_SIZE,
  SHARE_LINK_RATE_LIMIT_REQUESTS,
  SHARE_LINK_RATE_LIMIT_WINDOW_MS,
  SHARE_LINK_RATE_LIMITED_MESSAGE,
} from "./constants/api-keys";
import { createRateLimiter } from "./public-api/rate-limit";

const consumeShareLinkRateLimit = createRateLimiter({
  requests: SHARE_LINK_RATE_LIMIT_REQUESTS,
  windowMs: SHARE_LINK_RATE_LIMIT_WINDOW_MS,
  sweepSize: PUBLIC_API_RATE_LIMIT_SWEEP_SIZE,
});

export function rejectWhenShareLinkRateLimited(
  c: Context,
  token: string,
): Response | null {
  const rate = consumeShareLinkRateLimit(token);
  if (rate.allowed) return null;
  c.header(
    "Retry-After",
    String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 0)),
  );
  return c.json({ success: false, message: SHARE_LINK_RATE_LIMITED_MESSAGE }, 429);
}

export const shareLinkRateLimit = createMiddleware(async (c, next) => {
  const token = c.req.query("token");
  if (token) {
    const rejection = rejectWhenShareLinkRateLimited(c, token);
    if (rejection) return rejection;
  }
  await next();
});
