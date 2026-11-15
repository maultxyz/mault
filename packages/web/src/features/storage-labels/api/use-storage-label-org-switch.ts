import { useOrg } from "@/features/companies/api/use-organization";
import { STORAGE_LABEL_ORG_SEARCH_PARAM } from "@/lib/constants/storage";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export function useStorageLabelOrgSwitch(): boolean {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orgs, activeOrg, isLoading, setActiveOrg } = useOrg();
  const requestedOrgId = searchParams.get(STORAGE_LABEL_ORG_SEARCH_PARAM);
  const switchingOrgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!requestedOrgId || isLoading || switchingOrgIdRef.current === requestedOrgId) return;
    const removeOrgParam = () =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete(STORAGE_LABEL_ORG_SEARCH_PARAM);
          return next;
        },
        { replace: true },
      );
    const canSwitch =
      requestedOrgId !== activeOrg?.id && orgs.some((org) => org.id === requestedOrgId);
    if (!canSwitch) {
      removeOrgParam();
      return;
    }
    switchingOrgIdRef.current = requestedOrgId;
    void Promise.resolve(setActiveOrg(requestedOrgId)).finally(() => {
      switchingOrgIdRef.current = null;
      removeOrgParam();
    });
  }, [requestedOrgId, isLoading, activeOrg?.id, orgs, setActiveOrg, setSearchParams]);

  return !!requestedOrgId;
}
