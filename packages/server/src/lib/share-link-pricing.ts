import { SHARE_LINK_HIDDEN_PRICE_KEYS } from "./constants/card-prices";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function withoutPrices<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => withoutPrices(item)) as T;
  if (!isPlainObject(value)) return value;
  const stripped: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SHARE_LINK_HIDDEN_PRICE_KEYS.has(key)) continue;
    stripped[key] = withoutPrices(entry);
  }
  if ("priceableCount" in stripped) {
    stripped.priceableCount = 0;
    stripped.totalValue = 0;
    stripped.mostValuable = null;
    if (Array.isArray(stripped.sets)) {
      stripped.sets = stripped.sets.map((set) =>
        isPlainObject(set) ? { ...set, value: 0 } : set,
      );
    }
  }
  return stripped as T;
}

export function pricesForShareLink<T>(value: T, showsPrices: boolean): T {
  return showsPrices ? value : withoutPrices(value);
}
