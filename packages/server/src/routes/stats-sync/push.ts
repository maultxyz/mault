import {
  PUBLIC_API_KEY_HEADER,
  STATS_SYNC_KEY_PREFIX,
  statsSyncPushSchema,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { hashApiKey } from "../../lib/api-keys";
import {
  STATS_SYNC_BODY_INVALID_MESSAGE,
  STATS_SYNC_KEY_INVALID_MESSAGE,
  STATS_SYNC_LATEST_DAY_AHEAD_DAYS,
  STATS_SYNC_PUSH_RATE_LIMIT_REQUESTS,
  STATS_SYNC_PUSH_RATE_LIMIT_SWEEP_SIZE,
  STATS_SYNC_PUSH_RATE_LIMIT_WINDOW_MS,
  STATS_SYNC_RATE_LIMITED_MESSAGE,
} from "../../lib/constants/stats-sync";
import { createRateLimiter } from "../../lib/public-api/rate-limit";
import { resolveStatsSyncKey, storeSelfHostedScanDays } from "../../lib/stats-sync-keys";

const consumeStatsSyncRateLimit = createRateLimiter({
  requests: STATS_SYNC_PUSH_RATE_LIMIT_REQUESTS,
  windowMs: STATS_SYNC_PUSH_RATE_LIMIT_WINDOW_MS,
  sweepSize: STATS_SYNC_PUSH_RATE_LIMIT_SWEEP_SIZE,
});

function latestAcceptedDay(): string {
  const latest = new Date();
  latest.setUTCDate(latest.getUTCDate() + STATS_SYNC_LATEST_DAY_AHEAD_DAYS);
  return latest.toISOString().slice(0, 10);
}

export const statsSyncPushRoute = new Hono().post("/push", async (c) => {
  const token = c.req.header(PUBLIC_API_KEY_HEADER)?.trim() ?? "";
  if (!token.startsWith(STATS_SYNC_KEY_PREFIX)) {
    return c.json({ success: false, message: STATS_SYNC_KEY_INVALID_MESSAGE }, 401);
  }
  const keyHash = hashApiKey(token);
  const rate = consumeStatsSyncRateLimit(keyHash);
  if (!rate.allowed) {
    c.header(
      "Retry-After",
      String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 0)),
    );
    return c.json({ success: false, message: STATS_SYNC_RATE_LIMITED_MESSAGE }, 429);
  }
  const key = await resolveStatsSyncKey(keyHash);
  if (!key) {
    return c.json({ success: false, message: STATS_SYNC_KEY_INVALID_MESSAGE }, 401);
  }
  const body = statsSyncPushSchema.safeParse(await c.req.json().catch(() => null));
  const latestDay = latestAcceptedDay();
  if (!body.success || body.data.days.some((day) => day.day > latestDay)) {
    return c.json({ success: false, message: STATS_SYNC_BODY_INVALID_MESSAGE }, 400);
  }
  const data = await storeSelfHostedScanDays(key, body.data.days);
  return c.json({ success: true, data });
});
