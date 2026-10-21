import { EMPTY_CHECKLIST } from "@/lib/constants/guide";
import type { ChecklistStore } from "@/lib/interfaces/guide";
import { useSyncExternalStore } from "react";

export function useChecklist(store: ChecklistStore) {
  const checked = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => EMPTY_CHECKLIST,
  );

  return { checked, toggle: store.toggle, check: store.check };
}
