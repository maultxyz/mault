import type {
  PageRequest,
  ServerPagedList,
} from "@/lib/interfaces/pagination";
import { toServerPagination } from "@/lib/pagination";
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

  return {
    items: data?.items ?? [],
    isLoading: isPending,
    pagination: toServerPagination(data, setPage),
  };
}
