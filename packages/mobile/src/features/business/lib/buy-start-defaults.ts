import { BUY_SOURCE_TYPES } from "@magic-vault/shared";
import { BUY_START_DEFAULTS_KEY } from "@/lib/constants/storage-keys";
import type { BuyStartDefaults } from "@/lib/interfaces/business";
import { readKvJson, writeKvJson } from "@/lib/storage/kv";

export function readBuyStartDefaults(orgId: string): BuyStartDefaults | null {
  const stored = readKvJson<Record<string, BuyStartDefaults>>(BUY_START_DEFAULTS_KEY, {})[orgId];
  if (!stored || !BUY_SOURCE_TYPES.includes(stored.sourceType)) return null;
  return stored;
}

export function saveBuyStartDefaults(orgId: string, defaults: BuyStartDefaults): void {
  const all = readKvJson<Record<string, BuyStartDefaults>>(BUY_START_DEFAULTS_KEY, {});
  writeKvJson(BUY_START_DEFAULTS_KEY, { ...all, [orgId]: defaults });
}
