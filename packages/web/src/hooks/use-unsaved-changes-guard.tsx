import { useEffect } from "react";
import { useBlocker, type Blocker } from "react-router-dom";

export function useUnsavedChangesGuard(isDirty: boolean): Blocker {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return useBlocker(isDirty);
}
