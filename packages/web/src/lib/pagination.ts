import type { ClientPagination } from "@/lib/interfaces/pagination";
import type { PagedList } from "@magic-vault/shared";

export function toServerPagination<T>(
  data: PagedList<T> | null | undefined,
  setPage: (page: number) => void,
): ClientPagination<T> {
  const items = data?.items ?? [];
  const pageSize = data?.pageSize ?? 1;
  const page = data?.page ?? 1;
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return {
    pageItems: items,
    page,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
    from,
    to: from === 0 ? 0 : from + items.length - 1,
    total,
    setPage,
  };
}
