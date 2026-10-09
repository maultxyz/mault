export interface StorageLocationRow {
  guid: string;
  name: string;
  created_at: Date | string;
  last_used_at: Date | string | null;
  card_count: number;
  total_value: number;
}

export interface AssignBinToLocationInput {
  binId: number;
  binNumber: number;
  collectionId: number;
  locationId: number;
}
