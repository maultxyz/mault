import type { PlanConfig, PlanSettings } from "@magic-vault/shared";

export interface PublicPricing {
  business: { amount: number; currency: string; interval: string } | null;
  plans?: PlanConfig;
  maxConnectedSorters?: number;
}

export interface PlanBulletsProps {
  settings: PlanSettings;
  maxConnectedSorters: number;
  emphasized?: boolean;
}
