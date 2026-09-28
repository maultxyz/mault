import { DISPLAY_NAME_CACHE_TTL_MS } from "./constants/auth";

const cache = new Map<string, { name: string; expiresAt: number }>();

export async function cachedDisplayName(
  userId: string,
  load: (userId: string) => Promise<string>,
): Promise<string> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.name;
  const name = await load(userId);
  cache.set(userId, { name, expiresAt: Date.now() + DISPLAY_NAME_CACHE_TTL_MS });
  return name;
}
