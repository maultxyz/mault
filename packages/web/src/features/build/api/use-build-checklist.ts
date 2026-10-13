import { buildChecklistStore } from "@/features/build/lib/checklist-store";
import { EMPTY_CHECKLIST } from "@/lib/constants/build";
import { useSyncExternalStore } from "react";

export function useBuildChecklist() {
  const checked = useSyncExternalStore(
    buildChecklistStore.subscribe,
    buildChecklistStore.getSnapshot,
    () => EMPTY_CHECKLIST,
  );

  return { checked, toggle: buildChecklistStore.toggle };
}
