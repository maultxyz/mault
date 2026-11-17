import type {
  ClientPagination,
  PageSpreadItem,
} from "@/lib/interfaces/pagination";
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

function pageRange(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export function pageSpread(
  page: number,
  pageCount: number,
  siblingCount: number,
): PageSpreadItem[] {
  const visibleSlotCount = siblingCount * 2 + 5;
  if (pageCount <= visibleSlotCount) return pageRange(1, pageCount);
  const edgeBlockSize = siblingCount * 2 + 3;
  const firstSibling = Math.max(page - siblingCount, 1);
  const lastSibling = Math.min(page + siblingCount, pageCount);
  if (firstSibling <= 3) {
    return [...pageRange(1, edgeBlockSize), "end-ellipsis", pageCount];
  }
  if (lastSibling >= pageCount - 2) {
    return [
      1,
      "start-ellipsis",
      ...pageRange(pageCount - edgeBlockSize + 1, pageCount),
    ];
  }
  return [
    1,
    "start-ellipsis",
    ...pageRange(firstSibling, lastSibling),
    "end-ellipsis",
    pageCount,
  ];
}

export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(Math.round(page), 1), pageCount);
}
