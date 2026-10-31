import {
  PRICING_FEATURE_EXTRA_KEYS,
  PRICING_HIGHLIGHT_FEATURE_KEYS,
  PRICING_HIGHLIGHT_LIMIT_KEYS,
} from "@/lib/constants/pricing";
import {
  PLAN_FEATURE_KEYS,
  PLAN_LIMIT_KEYS,
  type PlanFeatureKey,
  type PlanLimitKey,
  type PlanSettings,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function planLimitValue(
  settings: PlanSettings,
  key: PlanLimitKey,
  maxConnectedSorters: number,
): number | null {
  const limit = settings.limits[key];
  return key === "connectedSorters"
    ? Math.min(limit ?? maxConnectedSorters, maxConnectedSorters)
    : limit;
}

function limitBullets(
  settings: PlanSettings,
  keys: readonly PlanLimitKey[],
  maxConnectedSorters: number,
  t: TFunction<"landing">,
): string[] {
  return keys.flatMap((key) => {
    const limit = planLimitValue(settings, key, maxConnectedSorters);
    if (limit === 0) return [];
    if (limit == null) return [t(`pricing.limits.${key}.unlimited`)];
    return [t(`pricing.limits.${key}.limited`, { count: limit })];
  });
}

function featureBullets(
  settings: PlanSettings,
  keys: readonly PlanFeatureKey[],
  t: TFunction<"landing">,
  withExtras: boolean,
): string[] {
  return keys
    .filter((key) => settings.features[key])
    .flatMap((key) => [
      key,
      ...(withExtras ? (PRICING_FEATURE_EXTRA_KEYS[key] ?? []) : []),
    ])
    .map((key) => t(`pricing.features.${key}`));
}

export function planBullets(
  settings: PlanSettings,
  maxConnectedSorters: number,
  t: TFunction<"landing">,
): string[] {
  return [
    ...limitBullets(settings, PLAN_LIMIT_KEYS, maxConnectedSorters, t),
    ...featureBullets(settings, PLAN_FEATURE_KEYS, t, true),
  ];
}

export function planHighlightBullets(
  settings: PlanSettings,
  maxConnectedSorters: number,
  t: TFunction<"landing">,
): string[] {
  return [
    ...limitBullets(
      settings,
      PRICING_HIGHLIGHT_LIMIT_KEYS,
      maxConnectedSorters,
      t,
    ),
    ...featureBullets(settings, PRICING_HIGHLIGHT_FEATURE_KEYS, t, false),
  ];
}
