import { CLIENT_LIST_PAGE_SIZE } from "@/lib/constants/pagination";
import type { ClientPagination } from "@/lib/interfaces/pagination";
import { useState } from "react";

export function useClientPagination<T>(
  items: T[],
  pageSize = CLIENT_LIST_PAGE_SIZE,
): ClientPagination<T> {
  const [requestedPage, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), pageCount);
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    pageItems,
    page,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + pageItems.length,
    total,
    setPage,
  };
}
