import type {
  PlanConfig,
  PlanFeatureKey,
  PlanKey,
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
};

export const PRICING_SHARED_FEATURE_KEYS = ["games", "notifications"] as const;

export const PRICING_FEATURE_EXTRA_KEYS: Partial<
  Record<PlanFeatureKey, readonly string[]>
> = {
  businessTools: ["businessOps"],
};

export const PRICING_HIGHLIGHTED_PLAN: PlanKey = "business";

export const PRICING_GRID_COLUMNS_CLASS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "lg:grid-cols-3",
};
