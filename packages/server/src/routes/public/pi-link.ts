import {
  PI_HOST_DEFAULT_NAME,
  PI_HOST_NAME_MAX_LENGTH,
  PI_LINK_PAIRING_CODE_PATTERN,
  PI_LINK_PAIRING_SECRET_HEADER,
  normalizePiPairingCode,
} from "@magic-vault/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import {
  PI_LINK_PAIRING_CREATE_RATE_LIMIT_KEY,
  PI_LINK_PAIRING_CREATE_RATE_LIMIT_REQUESTS,
  PI_LINK_PAIRING_CREATE_RATE_LIMIT_WINDOW_MS,
  PI_LINK_PAIRING_POLL_RATE_LIMIT_REQUESTS,
  PI_LINK_PAIRING_POLL_RATE_LIMIT_WINDOW_MS,
  PI_LINK_RATE_LIMIT_SWEEP_SIZE,
  PI_LINK_RATE_LIMITED_MESSAGE,
} from "../../lib/constants/pi-hosts";
import { createPiLinkPairing, pollPiLinkPairing } from "../../lib/pi-hosts";
import { createRateLimiter } from "../../lib/public-api/rate-limit";
import type { RateLimitResult } from "../../lib/interfaces/public-api";
import type { AppEnv } from "../../middleware/auth";

const consumePairingCreateRateLimit = createRateLimiter({
  requests: PI_LINK_PAIRING_CREATE_RATE_LIMIT_REQUESTS,
  windowMs: PI_LINK_PAIRING_CREATE_RATE_LIMIT_WINDOW_MS,
  sweepSize: PI_LINK_RATE_LIMIT_SWEEP_SIZE,
});

const consumePairingPollRateLimit = createRateLimiter({
  requests: PI_LINK_PAIRING_POLL_RATE_LIMIT_REQUESTS,
  windowMs: PI_LINK_PAIRING_POLL_RATE_LIMIT_WINDOW_MS,
  sweepSize: PI_LINK_RATE_LIMIT_SWEEP_SIZE,
});

function rateLimited(c: Context, rate: RateLimitResult): Response | null {
  if (rate.allowed) return null;
  c.header("Retry-After", String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 0)));
  return c.json({ success: false, message: PI_LINK_RATE_LIMITED_MESSAGE }, 429);
}

function cleanHostName(value: unknown): string {
  const name = typeof value === "string" ? value.trim().slice(0, PI_HOST_NAME_MAX_LENGTH) : "";
  return name || PI_HOST_DEFAULT_NAME;
}

export const publicPiLinkRoute = new Hono<AppEnv>()
  .post("/pi-link/pairings", async (c) => {
    const limited = rateLimited(c, consumePairingCreateRateLimit(PI_LINK_PAIRING_CREATE_RATE_LIMIT_KEY));
    if (limited) return limited;
    const body = (await c.req.json().catch(() => null)) as { name?: unknown } | null;
    const data = await createPiLinkPairing(cleanHostName(body?.name));
    return c.json({ success: true, data });
  })
  .get("/pi-link/pairings/:code", async (c) => {
    const code = normalizePiPairingCode(c.req.param("code"));
    const pollSecret = c.req.header(PI_LINK_PAIRING_SECRET_HEADER)?.trim();
    if (!PI_LINK_PAIRING_CODE_PATTERN.test(code) || !pollSecret)
      return c.json({ success: false, message: "Pairing not found." }, 404);
    const limited = rateLimited(c, consumePairingPollRateLimit(code));
    if (limited) return limited;
    const data = await pollPiLinkPairing(code, pollSecret);
    if (!data) return c.json({ success: false, message: "Pairing not found." }, 404);
    return c.json({ success: true, data });
  });
