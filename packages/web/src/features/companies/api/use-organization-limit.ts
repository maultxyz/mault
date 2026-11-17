import { billingQueryOptions } from "@/features/billing/api/billing";
import { useOrg } from "@/features/companies/api/use-organization";
import { useQuery } from "@tanstack/react-query";

export function useOrganizationLimit() {
  const { activeOrg } = useOrg();
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  const organizationLimit = billing?.maxOrganizations ?? null;
  const atOrganizationLimit =
    organizationLimit != null &&
    (billing?.ownedOrganizations ?? 0) >= organizationLimit;

  return {
    organizationLimit,
    atOrganizationLimit,
    activeOrgName: activeOrg?.name ?? null,
  };
}
