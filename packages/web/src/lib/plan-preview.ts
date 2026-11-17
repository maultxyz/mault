import { PLAN_PREVIEW_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { PLAN_KEYS, type PlanKey } from "@magic-vault/shared";
import { useSyncExternalStore } from "react";

function readStoredPlanPreview(): PlanKey | null {
  try {
    const stored = localStorage.getItem(PLAN_PREVIEW_STORAGE_KEY);
    return PLAN_KEYS.find((plan) => plan === stored) ?? null;
  } catch {
    return null;
  }
}

let planPreview: PlanKey | null = readStoredPlanPreview();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlanPreview(): PlanKey | null {
  return planPreview;
}

export function setPlanPreview(plan: PlanKey | null) {
  if (plan === planPreview) return;
  planPreview = plan;
  try {
    if (plan) localStorage.setItem(PLAN_PREVIEW_STORAGE_KEY, plan);
    else localStorage.removeItem(PLAN_PREVIEW_STORAGE_KEY);
  } catch {}
  for (const listener of listeners) listener();
}

export function usePlanPreviewValue(): PlanKey | null {
  return useSyncExternalStore(subscribe, getPlanPreview);
}
