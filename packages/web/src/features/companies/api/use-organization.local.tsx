import { useImpersonation } from "@/hooks/use-impersonation";
import { apiGet } from "@/lib/api/client";
import {
  getLocalActiveOrgId,
  setLocalActiveOrgId,
  subscribeLocalActiveOrg,
} from "@/lib/auth/local-active-org";
import { useLocalAuthSession } from "@/lib/auth/local-session-store";
import { LOCAL_ORGS_QUERY_KEY } from "@/lib/constants/query";
import type { LocalOrg } from "@/lib/interfaces/auth";
import { invalidateAppQueries } from "@/lib/query-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore } from "react";

async function fetchLocalOrgs(): Promise<LocalOrg[]> {
  const res = await apiGet<{ success: boolean; data?: LocalOrg[] }>(
    "/api/local-auth/organizations",
  );
  return res.data ?? [];
}

export function useOrgLocal() {
  const queryClient = useQueryClient();
  const session = useLocalAuthSession();
  const userId = session.data?.user.id ?? null;
  const orgsQuery = useQuery({
    queryKey: [LOCAL_ORGS_QUERY_KEY, userId],
    queryFn: fetchLocalOrgs,
    enabled: !!userId,
  });
  const orgs = orgsQuery.data ?? [];
  const activeOrgId = useSyncExternalStore(
    subscribeLocalActiveOrg,
    getLocalActiveOrgId,
  );
  const impersonation = useImpersonation();

  useEffect(() => {
    if (!orgsQuery.isSuccess || orgsQuery.isFetching) return;
    if (activeOrgId && !orgsQuery.data.some((o) => o.id === activeOrgId)) {
      setLocalActiveOrgId(null);
    }
  }, [orgsQuery.isSuccess, orgsQuery.isFetching, orgsQuery.data, activeOrgId]);

  const setActiveOrg = useCallback(
    async (orgId: string) => {
      if (impersonation.isImpersonating) {
        impersonation.setActiveOrgId(orgId);
        await invalidateAppQueries(queryClient);
        return;
      }
      const cached = queryClient.getQueryData<LocalOrg[]>([
        LOCAL_ORGS_QUERY_KEY,
        userId,
      ]);
      if (!cached?.some((o) => o.id === orgId)) {
        await queryClient.refetchQueries({
          queryKey: [LOCAL_ORGS_QUERY_KEY, userId],
        });
      }
      setLocalActiveOrgId(orgId);
      await invalidateAppQueries(queryClient);
    },
    [queryClient, impersonation, userId],
  );

  if (impersonation.isImpersonating) {
    const impersonatedActiveOrg =
      impersonation.orgs.find((o) => o.id === impersonation.activeOrgId) ??
      impersonation.orgs[0] ??
      null;
    return {
      orgs: impersonation.orgs,
      activeOrg: impersonatedActiveOrg,
      isLoading: false,
      setActiveOrg,
    };
  }

  return {
    orgs,
    activeOrg: orgs.find((o) => o.id === activeOrgId) ?? null,
    isLoading: session.isPending || (!!userId && orgsQuery.isPending),
    setActiveOrg,
  };
}
