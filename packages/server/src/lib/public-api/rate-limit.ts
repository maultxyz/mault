import {
  PUBLIC_API_RATE_LIMIT_REQUESTS,
  PUBLIC_API_RATE_LIMIT_SWEEP_SIZE,
  PUBLIC_API_RATE_LIMIT_WINDOW_MS,
} from "../constants/api-keys";
import type {
  RateLimiterConfig,
  RateLimitResult,
  RateLimitWindow,
} from "../interfaces/public-api";

export function createRateLimiter({
  requests,
  windowMs,
  sweepSize,
}: RateLimiterConfig): (key: string) => RateLimitResult {
  const windows = new Map<string, RateLimitWindow>();

  const sweepExpired = (now: number) => {
    for (const [key, window] of windows) {
      if (now - window.startedAt >= windowMs) windows.delete(key);
    }
  };

  return (key) => {
    const now = Date.now();
    if (windows.size >= sweepSize) sweepExpired(now);
    let window = windows.get(key);
    if (!window || now - window.startedAt >= windowMs) {
      window = { startedAt: now, count: 0 };
      windows.set(key, window);
    }
    window.count += 1;
    return {
      allowed: window.count <= requests,
      limit: requests,
      remaining: Math.max(requests - window.count, 0),
      resetAt: window.startedAt + windowMs,
    };
  };
}

export const consumeRateLimit = createRateLimiter({
  requests: PUBLIC_API_RATE_LIMIT_REQUESTS,
  windowMs: PUBLIC_API_RATE_LIMIT_WINDOW_MS,
  sweepSize: PUBLIC_API_RATE_LIMIT_SWEEP_SIZE,
});
