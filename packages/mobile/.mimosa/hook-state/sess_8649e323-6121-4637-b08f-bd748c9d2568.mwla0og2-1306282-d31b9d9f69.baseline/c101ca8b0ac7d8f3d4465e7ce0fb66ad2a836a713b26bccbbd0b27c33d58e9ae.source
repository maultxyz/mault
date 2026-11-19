import type { ReactNode } from "react";
import type { HeaderActionsStore } from "@/lib/interfaces/ui";

export function createHeaderActionsStore(): HeaderActionsStore {
  let actions: ReactNode = null;
  const listeners = new Set<() => void>();
  return {
    getActions: () => actions,
    setActions: (nextActions) => {
      actions = nextActions;
      listeners.forEach((notifyListener) => notifyListener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
