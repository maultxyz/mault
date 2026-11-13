import * as Crypto from "expo-crypto";
import { TRADE_GUEST_KEY } from "@/lib/constants/storage-keys";
import { readKv, writeKv } from "@/lib/storage/kv";

export function tradeGuestKey(): string {
  const stored = readKv(TRADE_GUEST_KEY);
  if (stored) return stored;
  const created = `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, "");
  writeKv(TRADE_GUEST_KEY, created);
  return created;
}
