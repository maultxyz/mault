import { useSyncExternalStore } from "react";
import { PLAN_PREVIEW_ROLE, type PlanKey } from "@magic-vault/shared";
import { getSessionSnapshot } from "@/lib/auth/session";
import type { PlanPreviewSelection } from "@/lib/interfaces/admin-plans";

let planPreviewSelection: PlanPreviewSelection | null = null;
const planPreviewListeners = new Set<() => void>();

function subscribeToPlanPreview(listener: () => void): () => void {
  planPreviewListeners.add(listener);
  return () => {
    planPreviewListeners.delete(listener);
  };
}

export function getPlanPreviewForSignedInAdmin(): PlanKey | null {
  const user = getSessionSnapshot().user;
  if (!planPreviewSelection || !user) return null;
  if (user.id !== planPreviewSelection.userId || user.role !== PLAN_PREVIEW_ROLE) return null;
  return planPreviewSelection.plan;
}

export function setPlanPreviewForSignedInAdmin(plan: PlanKey | null): void {
  const user = getSessionSnapshot().user;
  planPreviewSelection = plan && user ? { userId: user.id, plan } : null;
  for (const listener of planPreviewListeners) listener();
}

export function usePlanPreviewForSignedInAdmin(): PlanKey | null {
  return useSyncExternalStore(subscribeToPlanPreview, getPlanPreviewForSignedInAdmin);
}
