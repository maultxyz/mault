import {
  MAX_CONNECTED_SORTERS,
  PLAN_FEATURE_KEYS,
  PLAN_KEYS,
  PLAN_LIMIT_KEYS,
  PLAN_LIMIT_MAX,
  type PlanConfig,
  type PlanFeatureKey,
  type PlanKey,
  type PlanLimitKey,
  type PlanSettings,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { orgBilling, planSettings } from "../db/schema";
import { PLAN_CONFIG_REFRESH_MS } from "./constants/timing";
import {
  FREE_PLAN_DAILY_SCAN_LIMIT,
  FREE_PLAN_MAX_CONNECTED_SORTERS,
  FREE_PLAN_MAX_NOTIFICATION_RULES,
  FREE_PLAN_MAX_SOUND_RULES,
  isBillingEnabled,
} from "./stripe";

export function defaultPlanConfig(): PlanConfig {
  return {
    free: {
      features: { chaosSort: false, storage: false, apiAccess: false },
      limits: {
        dailyScans: FREE_PLAN_DAILY_SCAN_LIMIT,
        connectedSorters: FREE_PLAN_MAX_CONNECTED_SORTERS,
        soundRules: FREE_PLAN_MAX_SOUND_RULES,
        notificationRules: FREE_PLAN_MAX_NOTIFICATION_RULES,
      },
    },
    business: {
      features: { chaosSort: true, storage: true, apiAccess: true },
      limits: {
        dailyScans: null,
        connectedSorters: null,
        soundRules: null,
        notificationRules: null,
      },
    },
  };
}

let cachedConfig: PlanConfig = defaultPlanConfig();

function toLimit(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
  return Math.min(Math.max(value, 0), PLAN_LIMIT_MAX);
}

function mergeSettings(
  defaults: PlanSettings,
  features: unknown,
  limits: unknown,
): PlanSettings {
  const storedFeatures = (features ?? {}) as Record<string, unknown>;
  const storedLimits = (limits ?? {}) as Record<string, unknown>;
  return {
    features: Object.fromEntries(
      PLAN_FEATURE_KEYS.map((key) => {
        const stored = storedFeatures[key];
        return [
          key,
          typeof stored === "boolean" ? stored : defaults.features[key],
        ];
      }),
    ) as PlanSettings["features"],
    limits: Object.fromEntries(
      PLAN_LIMIT_KEYS.map((key) => [
        key,
        key in storedLimits
          ? toLimit(storedLimits[key], defaults.limits[key])
          : defaults.limits[key],
      ]),
    ) as PlanSettings["limits"],
  };
}

export function parsePlanConfig(input: unknown): PlanConfig | null {
  if (!input || typeof input !== "object") return null;
  const defaults = defaultPlanConfig();
  const raw = input as Record<string, { features?: unknown; limits?: unknown }>;
  const config = {} as PlanConfig;
  for (const plan of PLAN_KEYS) {
    const entry = raw[plan];
    if (!entry || typeof entry !== "object") return null;
    config[plan] = mergeSettings(defaults[plan], entry.features, entry.limits);
  }
  return config;
}

export async function refreshPlanConfig(): Promise<PlanConfig> {
  const rows = await db.select().from(planSettings);
  const defaults = defaultPlanConfig();
  const next = { ...defaults };
  for (const row of rows) {
    if (!PLAN_KEYS.includes(row.plan as PlanKey)) continue;
    const plan = row.plan as PlanKey;
    next[plan] = mergeSettings(defaults[plan], row.features, row.limits);
  }
  cachedConfig = next;
  return next;
}

export async function savePlanConfig(config: PlanConfig): Promise<PlanConfig> {
  await db.transaction(async (tx) => {
    for (const plan of PLAN_KEYS) {
      const values = {
        plan,
        features: config[plan].features,
        limits: config[plan].limits,
        updatedAt: new Date(),
      };
      await tx
        .insert(planSettings)
        .values(values)
        .onConflictDoUpdate({ target: planSettings.plan, set: values });
    }
  });
  return refreshPlanConfig();
}

export function startPlanConfigRefresh(): void {
  const refresh = () =>
    refreshPlanConfig().catch((err) =>
      console.error("Failed to load plan settings:", err),
    );
  void refresh();
  setInterval(refresh, PLAN_CONFIG_REFRESH_MS).unref();
}

export function getPlanConfig(): PlanConfig {
  return cachedConfig;
}

function toPlanKey(plan: string | undefined): PlanKey {
  return plan === "business" ? "business" : "free";
}

export function planHasFeature(
  plan: string | undefined,
  feature: PlanFeatureKey,
): boolean {
  if (!isBillingEnabled()) return true;
  return cachedConfig[toPlanKey(plan)].features[feature];
}

export function planLimit(
  plan: string | undefined,
  limit: PlanLimitKey,
): number | null {
  if (!isBillingEnabled()) return null;
  return cachedConfig[toPlanKey(plan)].limits[limit];
}

export function connectedSorterLimitForPlan(plan: string | undefined): number {
  const limit = planLimit(plan, "connectedSorters");
  return limit == null
    ? MAX_CONNECTED_SORTERS
    : Math.min(limit, MAX_CONNECTED_SORTERS);
}

export async function loadPlanForOrg(
  tx: Transaction,
  orgId: string,
): Promise<string | undefined> {
  if (!isBillingEnabled()) return undefined;
  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  return billing?.plan ?? "free";
}

export async function orgHasFeature(
  tx: Transaction,
  orgId: string,
  feature: PlanFeatureKey,
): Promise<boolean> {
  if (!isBillingEnabled()) return true;
  return planHasFeature(await loadPlanForOrg(tx, orgId), feature);
}
