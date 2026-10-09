import {
  PUBLIC_API_RATE_LIMIT_REQUESTS,
  PUBLIC_API_RATE_LIMIT_SWEEP_SIZE,
  PUBLIC_API_RATE_LIMIT_WINDOW_MS,
} from "../constants/api-keys";
import type {
  RateLimitResult,
  RateLimitWindow,
} from "../interfaces/public-api";

const windows = new Map<string, RateLimitWindow>();

function sweepExpired(now: number): void {
  for (const [key, window] of windows) {
    if (now - window.startedAt >= PUBLIC_API_RATE_LIMIT_WINDOW_MS) {
      windows.delete(key);
    }
  }
}

export function consumeRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  if (windows.size >= PUBLIC_API_RATE_LIMIT_SWEEP_SIZE) sweepExpired(now);
  let window = windows.get(key);
  if (!window || now - window.startedAt >= PUBLIC_API_RATE_LIMIT_WINDOW_MS) {
    window = { startedAt: now, count: 0 };
    windows.set(key, window);
  }
  window.count += 1;
  return {
    allowed: window.count <= PUBLIC_API_RATE_LIMIT_REQUESTS,
    limit: PUBLIC_API_RATE_LIMIT_REQUESTS,
    remaining: Math.max(PUBLIC_API_RATE_LIMIT_REQUESTS - window.count, 0),
    resetAt: window.startedAt + PUBLIC_API_RATE_LIMIT_WINDOW_MS,
  };
}
