import { partsChecklistStore } from "@/features/build/lib/checklist-store";
import { EMPTY_CHECKLIST } from "@/lib/constants/build";
import { useSyncExternalStore } from "react";

export function usePartsChecklist() {
  const checked = useSyncExternalStore(
    partsChecklistStore.subscribe,
    partsChecklistStore.getSnapshot,
    () => EMPTY_CHECKLIST,
  );

  return { checked, toggle: partsChecklistStore.toggle };
}
