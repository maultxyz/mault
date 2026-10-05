import { billingQueryOptions } from "@/features/billing/api/billing";
import { useOrg } from "@/features/companies/api/use-organization";
import { useQuery } from "@tanstack/react-query";

export function useStorageAccess() {
  const { activeOrg } = useOrg();
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  return { isLocked: billing?.storage === false };
}
