import { useQuery } from "@tanstack/react-query";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { useActiveOrgId } from "@/hooks/use-org";

export function useHasBusinessTools(): boolean {
  const access = useQuery(businessAccessQueryOptions(useActiveOrgId()));
  return !!access.data && !access.data.isLocked;
}
