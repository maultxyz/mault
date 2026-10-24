export interface ClientPagination<T> {
  pageItems: T[];
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  setPage: (page: number) => void;
}

export interface ListPaginationProps {
  pagination: ClientPagination<unknown>;
  compact?: boolean;
}

export interface PageRequest {
  page: number | null;
  selected: string | null;
}

export interface ServerPagedList<T> {
  items: T[];
  pagination: ClientPagination<T>;
  isLoading: boolean;
}
