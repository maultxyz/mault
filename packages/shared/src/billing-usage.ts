import { PLAN_FEATURE_KEYS, PLAN_LIMIT_KEYS } from "./constants/plans.constant";
import type {
  BillingPlanTableRow,
  BillingStatus,
  PlanFeatureKey,
  PlanLimitKey,
} from "./interfaces/plans.interface";

function limitAndUsage(
  billing: BillingStatus,
  key: PlanLimitKey,
): { limit: number | null | undefined; used: number | null } {
  switch (key) {
    case "dailyScans":
      return { limit: billing.dailyLimit, used: billing.cardsScannedToday };
    case "organizations":
      return {
        limit: billing.maxOrganizations,
        used: billing.ownedOrganizations ?? null,
      };
    case "membersPerOrg":
      return {
        limit: billing.maxMembersPerOrg,
        used: billing.memberCount ?? null,
      };
    case "connectedSorters":
      return { limit: billing.maxConnectedSorters, used: null };
    case "soundRules":
      return {
        limit: billing.maxSoundRules,
        used: billing.soundRuleCount ?? null,
      };
    case "notificationRules":
      return {
        limit: billing.maxNotificationRules,
        used: billing.notificationRuleCount ?? null,
      };
    case "collections":
      return {
        limit: billing.maxCollections,
        used: billing.collectionCount ?? null,
      };
  }
}

function featureUsage(
  billing: BillingStatus,
  key: PlanFeatureKey,
): number | null {
  return key === "storage" ? (billing.storageLocationCount ?? null) : null;
}

export function billingPlanTableRows(
  billing: BillingStatus,
): BillingPlanTableRow[] {
  const limitRows = PLAN_LIMIT_KEYS.flatMap((key): BillingPlanTableRow[] => {
    const { limit, used } = limitAndUsage(billing, key);
    if (limit === undefined) return [];
    return [{ kind: "limit", key, limit, used }];
  });
  const featureRows = PLAN_FEATURE_KEYS.flatMap(
    (key): BillingPlanTableRow[] => {
      const included = billing[key];
      if (included === undefined) return [];
      return [
        {
          kind: "feature",
          key,
          included,
          used: included ? featureUsage(billing, key) : null,
        },
      ];
    },
  );
  return [...limitRows, ...featureRows];
}

export function billingPlanRowUsagePercent(
  row: BillingPlanTableRow,
): number | null {
  if (row.kind !== "limit" || row.limit == null || row.used == null) {
    return null;
  }
  if (row.limit <= 0) return 0;
  return Math.min(100, Math.round((row.used / row.limit) * 100));
}
