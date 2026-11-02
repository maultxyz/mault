export interface ClientPagination<T> {
  pageItems: T[];
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  setPage: (page: number) => void;
}

export interface PaginationControls {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  from?: number;
  to?: number;
  total?: number;
}

export interface ListPaginationProps {
  pagination: PaginationControls;
  compact?: boolean;
  className?: string;
}

export type PageSpreadItem = number | "start-ellipsis" | "end-ellipsis";

export interface PageRequest {
  page: number | null;
  selected: string | null;
}

export interface ServerPagedList<T> {
  items: T[];
  pagination: ClientPagination<T>;
  isLoading: boolean;
}
