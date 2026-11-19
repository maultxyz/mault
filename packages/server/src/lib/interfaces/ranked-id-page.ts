export interface RankedIdPage {
  rowIds: number[];
  total: number;
  page: number;
}

export interface RankedIdPageRow {
  id: number | string;
  total: number | string;
}
