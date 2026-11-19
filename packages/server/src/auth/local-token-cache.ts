import { createHash } from "node:crypto";
import {
  AUTH_LOOKUP_CACHE_MAX_ENTRIES,
  AUTH_LOOKUP_CACHE_TTL_MS,
} from "../lib/constants/timing";
import type { VerifiedLocalToken } from "../lib/interfaces/auth";

const verifiedTokens = new Map<string, VerifiedLocalToken>();
let verifiedTokenGeneration = 0;

function tokenCacheKey(token: string): string {
  return createHash("sha256").update(token).digest("base64");
}

export function clearVerifiedLocalTokens(): void {
  verifiedTokenGeneration += 1;
  verifiedTokens.clear();
}

export async function verifyLocalTokenThroughCache(
  token: string,
  verify: (token: string) => Promise<{ sub: string } | null>,
): Promise<{ sub: string } | null> {
  const cacheKey = tokenCacheKey(token);
  const cached = verifiedTokens.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { sub: cached.sub };
  const generationAtVerify = verifiedTokenGeneration;
  const verified = await verify(token);
  if (!verified) {
    verifiedTokens.delete(cacheKey);
    return null;
  }
  if (generationAtVerify === verifiedTokenGeneration) {
    verifiedTokens.delete(cacheKey);
    if (verifiedTokens.size >= AUTH_LOOKUP_CACHE_MAX_ENTRIES) {
      const oldestKey = verifiedTokens.keys().next().value;
      if (oldestKey !== undefined) verifiedTokens.delete(oldestKey);
    }
    verifiedTokens.set(cacheKey, {
      sub: verified.sub,
      expiresAt: Date.now() + AUTH_LOOKUP_CACHE_TTL_MS,
    });
  }
  return verified;
}
