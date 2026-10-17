import { useSession } from "@/lib/auth/session";
import type { UserOrganization } from "@/lib/interfaces/auth";

export function useActiveOrg(): UserOrganization | null {
  const { organizations, activeOrgId } = useSession();
  return organizations.find((org) => org.id === activeOrgId) ?? null;
}

export function useActiveOrgId(): string | null {
  return useSession().activeOrgId;
}
