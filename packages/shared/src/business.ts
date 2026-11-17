import {
  ACCURACY_CONFIDENCE_Z,
  BUSINESS_PERMISSION_KEYS,
  BUYLIST_CREDIT_BONUS_MAX,
  BUYLIST_PERCENT_MAX,
  BUYLIST_PRICE_MAX,
  BUYLIST_TIERS_MAX,
  DEFAULT_BUSINESS_PERMISSIONS,
  DEFAULT_BUYLIST_CONFIG,
} from "./constants/business.constant";
import type {
  AccuracyEstimate,
  BuylistConfig,
  BuylistTier,
  BusinessPermissions,
} from "./interfaces/business.interface";

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function toBoundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

export function toBuylistConfig(value: unknown): BuylistConfig {
  const input =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof BuylistConfig, unknown>>)
      : {};
  const tiers = Array.isArray(input.tiers)
    ? input.tiers
        .map((tier): BuylistTier | null => {
          const t = (tier ?? {}) as Partial<Record<keyof BuylistTier, unknown>>;
          const minPrice = toBoundedNumber(t.minPrice, 0, BUYLIST_PRICE_MAX);
          const percent = toBoundedNumber(t.percent, 0, BUYLIST_PERCENT_MAX);
          return minPrice === null || percent === null
            ? null
            : { minPrice, percent };
        })
        .filter((tier): tier is BuylistTier => tier !== null)
        .slice(0, BUYLIST_TIERS_MAX)
    : null;
  return {
    minCardValue:
      toBoundedNumber(input.minCardValue, 0, BUYLIST_PRICE_MAX) ??
      DEFAULT_BUYLIST_CONFIG.minCardValue,
    tiers: tiers?.length ? sortBuylistTiers(tiers) : DEFAULT_BUYLIST_CONFIG.tiers,
    bulkThreshold:
      toBoundedNumber(input.bulkThreshold, 0, BUYLIST_PRICE_MAX) ??
      DEFAULT_BUYLIST_CONFIG.bulkThreshold,
    bulkOffer:
      toBoundedNumber(input.bulkOffer, 0, BUYLIST_PRICE_MAX) ??
      DEFAULT_BUYLIST_CONFIG.bulkOffer,
    creditBonusPercent:
      toBoundedNumber(input.creditBonusPercent, 0, BUYLIST_CREDIT_BONUS_MAX) ??
      DEFAULT_BUYLIST_CONFIG.creditBonusPercent,
  };
}

export function sortBuylistTiers(tiers: BuylistTier[]): BuylistTier[] {
  return [...tiers].sort((a, b) => b.minPrice - a.minPrice);
}

export function toBusinessPermissions(value: unknown): BusinessPermissions {
  const input =
    value && typeof value === "object"
      ? (value as Partial<Record<string, unknown>>)
      : {};
  const result = { ...DEFAULT_BUSINESS_PERMISSIONS };
  for (const key of BUSINESS_PERMISSION_KEYS) {
    if (typeof input[key] === "boolean") result[key] = input[key] as boolean;
  }
  return result;
}

export function isBelowBuylistMinimum(
  marketPrice: number | null,
  config: BuylistConfig,
): boolean {
  return (
    config.minCardValue > 0 &&
    (marketPrice === null || marketPrice < config.minCardValue)
  );
}

export function buylistOfferFor(
  marketPrice: number | null,
  config: BuylistConfig,
): number {
  if (isBelowBuylistMinimum(marketPrice, config)) return 0;
  if (marketPrice === null || marketPrice <= 0) return 0;
  if (marketPrice < config.bulkThreshold) {
    return Math.min(config.bulkOffer, marketPrice);
  }
  const tier = sortBuylistTiers(config.tiers).find(
    (t) => marketPrice >= t.minPrice,
  );
  return tier ? roundCurrency((marketPrice * tier.percent) / 100) : 0;
}

export function creditOfferFor(cashOffer: number, config: BuylistConfig): number {
  return roundCurrency(cashOffer * (1 + config.creditBonusPercent / 100));
}

export function spreadTotal(weights: number[], total: number): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((acc, w) => acc + Math.max(w, 0), 0);
  const shares =
    sum > 0
      ? weights.map((w) => (Math.max(w, 0) / sum) * total)
      : weights.map(() => total / weights.length);
  const rounded = shares.map(roundCurrency);
  const drift = roundCurrency(total - rounded.reduce((acc, v) => acc + v, 0));
  if (drift !== 0) {
    const largest = rounded.indexOf(Math.max(...rounded));
    rounded[largest] = roundCurrency(rounded[largest] + drift);
  }
  return rounded;
}

export function wilsonInterval(
  successes: number,
  total: number,
  z = ACCURACY_CONFIDENCE_Z,
): AccuracyEstimate | null {
  if (total <= 0) return null;
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) /
    denominator;
  return {
    accuracy: p,
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}
