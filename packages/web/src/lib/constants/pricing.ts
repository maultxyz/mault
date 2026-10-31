import type {
  PlanConfig,
  PlanFeatureKey,
  PlanKey,
  PlanLimitKey,
} from "@magic-vault/shared";

export const DEFAULT_PUBLIC_PLAN_CONFIG: PlanConfig = {
  free: {
    features: {
      chaosSort: false,
      repacks: true,
      customSounds: true,
      fleetHealth: true,
      storage: false,
      apiAccess: false,
      businessTools: false,
    },
    limits: {
      dailyScans: 50,
      organizations: null,
      membersPerOrg: null,
      connectedSorters: 1,
      soundRules: 1,
      notificationRules: 1,
      collections: null,
    },
  },
  enthusiast: {
    features: {
      chaosSort: true,
      repacks: true,
      customSounds: true,
      fleetHealth: true,
      storage: true,
      apiAccess: false,
      businessTools: false,
    },
    limits: {
      dailyScans: 500,
      organizations: null,
      membersPerOrg: null,
      connectedSorters: 2,
      soundRules: 5,
      notificationRules: 5,
      collections: null,
    },
  },
  business: {
    features: {
      chaosSort: true,
      repacks: true,
      customSounds: true,
      fleetHealth: true,
      storage: true,
      apiAccess: true,
      businessTools: true,
    },
    limits: {
      dailyScans: null,
      organizations: null,
      membersPerOrg: null,
      connectedSorters: null,
      soundRules: null,
      notificationRules: null,
      collections: null,
    },
  },
  legacyBusiness: {
    features: {
      chaosSort: true,
      repacks: true,
      customSounds: true,
      fleetHealth: true,
      storage: true,
      apiAccess: true,
      businessTools: true,
    },
    limits: {
      dailyScans: null,
      organizations: null,
      membersPerOrg: null,
      connectedSorters: null,
      soundRules: null,
      notificationRules: null,
      collections: null,
    },
  },
};

export const PRICING_SHARED_FEATURE_KEYS = ["games", "notifications"] as const;

export const PRICING_FEATURE_EXTRA_KEYS: Partial<
  Record<PlanFeatureKey, readonly string[]>
> = {
  businessTools: ["businessOps"],
};

export const PRICING_HIGHLIGHTED_PLAN: PlanKey = "enthusiast";

export const PRICING_FALLBACK_HIGHLIGHTED_PLAN: PlanKey = "business";

export const PRICING_GRID_COLUMNS_CLASS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "lg:grid-cols-3",
};

export const PRICING_HIGHLIGHT_LIMIT_KEYS: readonly PlanLimitKey[] = [
  "dailyScans",
  "connectedSorters",
  "membersPerOrg",
];

export const PRICING_HIGHLIGHT_FEATURE_KEYS: readonly PlanFeatureKey[] = [
  "chaosSort",
  "storage",
  "businessTools",
];

export const PRICING_COMPARISON_ID = "pricing-comparison";

export const PRICING_COMPARISON_GRID_CLASS: Record<number, string> = {
  1: "grid-cols-[minmax(0,1fr)_minmax(4.5rem,9rem)]",
  2: "grid-cols-[minmax(0,1fr)_repeat(2,minmax(4.5rem,9rem))]",
  3: "grid-cols-[minmax(0,1fr)_repeat(3,minmax(4.5rem,9rem))]",
};
