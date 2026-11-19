import { infiniteQueryOptions } from "@tanstack/react-query";
import type { DeletedItem, DeletedItemType, PagedList, Result } from "@magic-vault/shared";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import { DELETED_ITEMS_PAGE_SIZE, DELETED_ITEMS_QUERY_KEY } from "@/lib/constants/admin-deleted";
import type { DeletedItemsRequest } from "@/lib/interfaces/admin-deleted";

export const deletedItemsQueryOptions = (request: DeletedItemsRequest) =>
  infiniteQueryOptions({
    queryKey: [...DELETED_ITEMS_QUERY_KEY, request] as const,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: String(DELETED_ITEMS_PAGE_SIZE) });
      if (request.search) params.set("q", request.search);
      if (request.type) params.set("type", request.type);
      return unwrap(apiGet<Result<PagedList<DeletedItem>>>(`/api/admin/deleted?${params}`));
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  });

export function restoreDeletedItem(type: DeletedItemType, guid: string): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/admin/deleted/${type}/${guid}/restore`);
}
