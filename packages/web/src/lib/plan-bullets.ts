import { PRICING_FEATURE_EXTRA_KEYS } from "@/lib/constants/pricing";
import {
  PLAN_FEATURE_KEYS,
  PLAN_LIMIT_KEYS,
  type PlanSettings,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function planBullets(
  settings: PlanSettings,
  maxConnectedSorters: number,
  t: TFunction<"landing">,
): string[] {
  const { limits, features } = settings;
  const limitBullets = PLAN_LIMIT_KEYS.flatMap((key) => {
    const limit =
      key === "connectedSorters"
        ? Math.min(limits[key] ?? maxConnectedSorters, maxConnectedSorters)
        : limits[key];
    if (limit === 0) return [];
    if (limit == null) return [t(`pricing.limits.${key}.unlimited`)];
    return [t(`pricing.limits.${key}.limited`, { count: limit })];
  });
  const featureBullets = PLAN_FEATURE_KEYS.filter((key) => features[key])
    .flatMap((key) => [key, ...(PRICING_FEATURE_EXTRA_KEYS[key] ?? [])])
    .map((key) => t(`pricing.features.${key}`));
  return [...limitBullets, ...featureBullets];
}
