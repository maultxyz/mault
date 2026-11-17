export interface PageParams {
  page: number | null;
  pageSize: number;
  selected: string | null;
}

export interface PageWindow {
  total: number;
  page: number;
  pageSize: number;
  offset: number;
  guids: string[];
}
