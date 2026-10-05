import type {
  PLAN_FEATURE_KEYS,
  PLAN_KEYS,
  PLAN_LIMIT_KEYS,
} from "../constants/plans.constant";

export type PlanKey = (typeof PLAN_KEYS)[number];
export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

export interface PlanSettings {
  features: Record<PlanFeatureKey, boolean>;
  limits: Record<PlanLimitKey, number | null>;
}

export type PlanConfig = Record<PlanKey, PlanSettings>;

export interface AdminPlanConfigResponse {
  config: PlanConfig;
  defaults: PlanConfig;
  billingEnabled: boolean;
}
