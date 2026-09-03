import { useImpersonation } from "@/hooks/use-impersonation";
import { neon } from "@/lib/auth/client";
import { invalidateAppQueries } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const ORG_KEY = "activeOrgId";

export function useOrgNeon() {
  const queryClient = useQueryClient();
  const { data: orgs, isPending: orgsLoading } =
    neon.auth.useListOrganizations();
  const { data: activeOrg, isPending: orgLoading } =
    neon.auth.useActiveOrganization();
  const { refetch: refetchActiveMember } = neon.auth.useActiveMember();
  const [isRestoring, setIsRestoring] = useState(
    () => !!localStorage.getItem(ORG_KEY),
  );
  const impersonation = useImpersonation();

  const setActiveOrg = useCallback(
    async (orgId: string) => {
      if (impersonation.isImpersonating) {
        impersonation.setActiveOrgId(orgId);
        await invalidateAppQueries(queryClient);
        return;
      }
      localStorage.setItem(ORG_KEY, orgId);
      await neon.auth.organization.setActive({ organizationId: orgId });
      await Promise.all([
        refetchActiveMember(),
        invalidateAppQueries(queryClient),
      ]);
    },
    [queryClient, refetchActiveMember, impersonation],
  );

  useEffect(() => {
    // Only fires when activeOrg.id actually changes — not on every render — so it
    // can't stomp the localStorage value setActiveOrg() just wrote with a stale
    // activeOrg still catching up to an in-flight switch.
    if (activeOrg?.id) {
      localStorage.setItem(ORG_KEY, activeOrg.id);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (impersonation.isImpersonating) return;
    if (orgLoading || orgsLoading) return;
    if (activeOrg) {
      setIsRestoring(false);
      return;
    }
    const lastOrgId = localStorage.getItem(ORG_KEY);
    if (lastOrgId && orgs?.some((o) => o.id === lastOrgId)) {
      setActiveOrg(lastOrgId).finally(() => setIsRestoring(false));
    } else {
      if (lastOrgId) localStorage.removeItem(ORG_KEY);
      setIsRestoring(false);
    }
  }, [
    orgLoading,
    orgsLoading,
    activeOrg,
    orgs,
    setActiveOrg,
    impersonation.isImpersonating,
  ]);

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
    orgs: orgs ?? [],
    activeOrg: activeOrg ?? null,
    isLoading: orgsLoading || orgLoading || isRestoring,
    setActiveOrg,
  };
}
