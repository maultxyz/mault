import { useQueryClient } from "@tanstack/react-query";
import { setActiveOrg, useSession } from "@/lib/auth/session";
import type { UserOrganization } from "@/lib/interfaces/auth";

export function useActiveOrg(): UserOrganization | null {
  const { organizations, activeOrgId } = useSession();
  return organizations.find((org) => org.id === activeOrgId) ?? null;
}

export function useActiveOrgId(): string | null {
  return useSession().activeOrgId;
}

export function useSwitchOrg(): (orgId: string) => void {
  const queryClient = useQueryClient();
  const { activeOrgId } = useSession();
  return (orgId: string) => {
    if (orgId === activeOrgId) return;
    setActiveOrg(orgId);
    queryClient.clear();
  };
}
