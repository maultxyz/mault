import { apiGet, apiPost } from "@/lib/api/client";
import type { DeletedItem, DeletedItemType, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const deletedItemsQueryOptions = queryOptions({
  queryKey: ["admin", "deleted"] as const,
  queryFn: () =>
    apiGet<Result<DeletedItem[]>>("/api/admin/deleted").then(
      (r) => r.data ?? [],
    ),
});

export function restoreDeletedItem(
  type: DeletedItemType,
  guid: string,
): Promise<Result<null>> {
  return apiPost(`/api/admin/deleted/${type}/${guid}/restore`);
}
