export interface StorageLocationRow {
  guid: string;
  name: string;
  created_at: Date | string;
  last_used_at: Date | string | null;
  card_count: number;
  total_value: number;
}

export interface MoveCardsToLocationInput {
  orgId: string;
  locationId: number;
  scanIds: string[];
}

export interface AssignBinToLocationInput {
  binNumber: number;
  collectionId: number;
  locationId: number;
}

export interface MoveCollectionToLocationInput {
  collectionId: number;
  locationId: number;
}

export interface StoredCardIdsPage {
  rowIds: number[];
  total: number;
  page: number;
}

export interface StoredCardNavigationRow {
  index: number;
  total: number;
  prev_scan_id: string | null;
  prev_collection_guid: string | null;
  next_scan_id: string | null;
  next_collection_guid: string | null;
}
