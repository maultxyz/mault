import type { StorageLocation } from "@magic-vault/shared";

export function lastUsedLocationGuid(
  locations: StorageLocation[],
): string | null {
  let latest: StorageLocation | null = null;
  for (const location of locations) {
    if (!location.lastUsedAt) continue;
    if (
      !latest?.lastUsedAt ||
      new Date(location.lastUsedAt) > new Date(latest.lastUsedAt)
    )
      latest = location;
  }
  return latest?.guid ?? null;
}
