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
}
