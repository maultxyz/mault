import { apiGet, apiPost } from "@/lib/api/client";
import { CLIENT_LIST_PAGE_SIZE } from "@/lib/constants/pagination";
import type { DeletedItemsRequest } from "@/lib/interfaces/admin";
import type {
  DeletedItem,
  DeletedItemType,
  PagedList,
  Result,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const deletedItemsKeys = {
  root: () => ["admin", "deleted"] as const,
  page: (request: DeletedItemsRequest) =>
    [...deletedItemsKeys.root(), request] as const,
};

export const deletedItemsQueryOptions = (request: DeletedItemsRequest) =>
  queryOptions({
    queryKey: deletedItemsKeys.page(request),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(request.page),
        limit: String(CLIENT_LIST_PAGE_SIZE),
      });
      if (request.search) params.set("q", request.search);
      if (request.type) params.set("type", request.type);
      return apiGet<Result<PagedList<DeletedItem>>>(
        `/api/admin/deleted?${params}`,
      ).then((r) => r.data ?? null);
    },
    placeholderData: keepPreviousData,
  });

export function restoreDeletedItem(
  type: DeletedItemType,
  guid: string,
): Promise<Result<null>> {
  return apiPost(`/api/admin/deleted/${type}/${guid}/restore`);
}
