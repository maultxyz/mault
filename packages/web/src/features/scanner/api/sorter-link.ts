import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { SORTER_LINKS_REFETCH_MS } from "@/lib/constants/timing";
import type {
  Result,
  SorterLinkCredentials,
  SorterLinkStatus,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const sorterLinksQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["sorter-links", orgId] as const,
    queryFn: () =>
      apiGet<Result<SorterLinkStatus[]>>("/api/devices/sorter-links").then(
        (r) => r.data ?? [],
      ),
    refetchInterval: SORTER_LINKS_REFETCH_MS,
    enabled: !!orgId,
  });

export async function createSorterLink(
  deviceGuid: string,
): Promise<Result<SorterLinkCredentials>> {
  return apiPost<Result<SorterLinkCredentials>>(
    `/api/devices/${deviceGuid}/sorter-link`,
  );
}

export async function deleteSorterLink(deviceGuid: string): Promise<Result> {
  return apiDelete<Result>(`/api/devices/${deviceGuid}/sorter-link`);
}
