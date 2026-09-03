import { useImpersonation } from "@/hooks/use-impersonation";
import { apiGet } from "@/lib/api/client";
import { invalidateAppQueries } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const ORG_KEY = "activeOrgId";

interface LocalOrg {
  id: string;
  name: string;
  role: string;
}

// own-auth has no server-side "active organization" concept - unlike Neon
// mode, which round-trips organization.setActive() to the identity provider
// before invalidating queries, localStorage is the only source of truth
// here, so switching orgs is a synchronous local write.
export function useOrgLocal() {
  const queryClient = useQueryClient();
  const [orgs, setOrgs] = useState<LocalOrg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() =>
    localStorage.getItem(ORG_KEY),
  );
  const impersonation = useImpersonation();

  useEffect(() => {
    let cancelled = false;
    apiGet<{ success: boolean; data?: LocalOrg[] }>("/api/local-auth/organizations")
      .then((res) => {
        if (!cancelled) setOrgs(res.data ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (activeOrgId && !orgs.some((o) => o.id === activeOrgId)) {
      localStorage.removeItem(ORG_KEY);
      setActiveOrgId(null);
    }
  }, [isLoading, orgs, activeOrgId]);

  const setActiveOrg = useCallback(
    async (orgId: string) => {
      if (impersonation.isImpersonating) {
        impersonation.setActiveOrgId(orgId);
        await invalidateAppQueries(queryClient);
        return;
      }
      localStorage.setItem(ORG_KEY, orgId);
      setActiveOrgId(orgId);
      await invalidateAppQueries(queryClient);
    },
    [queryClient, impersonation],
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
    isLoading,
    setActiveOrg,
  };
}
