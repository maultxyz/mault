export interface OwnedCardSearchRow {
  scan_id: string;
  collection_guid: string;
  collection_name: string;
  card_name: string | null;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  image_url: string | null;
  is_foil: boolean;
  location_guid: string | null;
  location_name: string | null;
  location_position: number | null;
}
