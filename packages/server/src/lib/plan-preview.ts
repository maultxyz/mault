import { AsyncLocalStorage } from "node:async_hooks";
import { PLAN_KEYS, type PlanKey } from "@magic-vault/shared";

export const planPreviewStorage = new AsyncLocalStorage<PlanKey>();

export function parsePreviewPlan(value: string | undefined): PlanKey | null {
  return PLAN_KEYS.find((plan) => plan === value) ?? null;
}

export function currentPreviewPlan(): PlanKey | undefined {
  return planPreviewStorage.getStore();
}
