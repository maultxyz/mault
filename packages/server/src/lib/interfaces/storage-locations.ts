export interface StorageLocationRow {
  guid: string;
  name: string;
  created_at: Date | string;
  card_count: number;
  total_value: number;
}

export interface AssignBinToLocationInput {
  binId: number;
  binNumber: number;
  collectionId: number;
  locationId: number;
}
