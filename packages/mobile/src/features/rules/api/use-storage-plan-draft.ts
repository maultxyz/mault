import { useSyncExternalStore } from "react";
import { readStoragePlanDraft, subscribeToStoragePlanDraft } from "@/features/rules/lib/storage-plan-draft";
import type { StoragePlanDraft } from "@/lib/interfaces/rules";

export function useStoragePlanDraft(): StoragePlanDraft {
  return useSyncExternalStore(subscribeToStoragePlanDraft, readStoragePlanDraft);
}
