import type {
  PageRequest,
  ServerPagedList,
} from "@/lib/interfaces/pagination";
import type { PagedList } from "@magic-vault/shared";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export function useServerPagedList<
  T extends { guid: string },
  TKey extends readonly unknown[],
>(
  options: (
    request: PageRequest,
  ) => UseQueryOptions<PagedList<T> | null, Error, PagedList<T> | null, TKey>,
  selected: string | null,
): ServerPagedList<T> {
  const [page, setPage] = useState<number | null>(null);
  const request: PageRequest = {
    page,
    selected: page === null ? selected : null,
  };
  const { data, isPending } = useQuery(options(request));
  const previousSelected = useRef(selected);

  useEffect(() => {
    if (previousSelected.current === selected) return;
    previousSelected.current = selected;
    if (selected && data && !data.items.some((item) => item.guid === selected)) {
      setPage(null);
    }
  }, [selected, data]);

  const items = data?.items ?? [];
  const pageSize = data?.pageSize ?? 1;
  const currentPage = data?.page ?? 1;
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  return {
    items,
    isLoading: isPending,
    pagination: {
      pageItems: items,
      page: currentPage,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
      from,
      to: from === 0 ? 0 : from + items.length - 1,
      total,
      setPage,
    },
  };
}
