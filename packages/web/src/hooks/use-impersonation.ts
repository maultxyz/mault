import { startImpersonation, stopImpersonation } from "@/lib/api/admin";
import {
  beginImpersonation,
  clearImpersonation,
  getImpersonationState,
  setImpersonationOrgId,
  subscribeImpersonation,
} from "@/lib/auth/impersonation";
import { invalidateAppQueries } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";

export function useImpersonation() {
  const state = useSyncExternalStore(
    subscribeImpersonation,
    getImpersonationState,
  );
  const queryClient = useQueryClient();

  const start = useCallback(
    async (userId: string) => {
      const result = await startImpersonation(userId);
      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to start impersonation.");
      }
      beginImpersonation(result.data);
      await invalidateAppQueries(queryClient);
    },
    [queryClient],
  );

  const stop = useCallback(async () => {
    if (!getImpersonationState()) return;
    try {
      await stopImpersonation();
    } catch (err) {
      console.error("Failed to close out impersonation session:", err);
    } finally {
      clearImpersonation();
      await invalidateAppQueries(queryClient);
    }
  }, [queryClient]);

  return useMemo(
    () => ({
      isImpersonating: !!state,
      impersonatedUser: state?.user ?? null,
      orgs: state?.orgs ?? [],
      activeOrgId: state?.activeOrgId ?? null,
      setActiveOrgId: setImpersonationOrgId,
      start,
      stop,
    }),
    [state, start, stop],
  );
}
