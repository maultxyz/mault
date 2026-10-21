import { selfHostChecklistStore } from "@/features/self-host/lib/checklist-store";
import { EMPTY_CHECKLIST } from "@/lib/constants/build";
import { useSyncExternalStore } from "react";

export function useSelfHostChecklist() {
  const checked = useSyncExternalStore(
    selfHostChecklistStore.subscribe,
    selfHostChecklistStore.getSnapshot,
    () => EMPTY_CHECKLIST,
  );

  return { checked, toggle: selfHostChecklistStore.toggle };
}
