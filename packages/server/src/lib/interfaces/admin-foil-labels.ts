import type { FoilDetectionMethod } from "@magic-vault/shared";

export interface AdminFoilLabelQueueRow {
  scan_id: string;
  org_id: string;
  collection_name: string;
  game_key: string | null;
  card_name: string | null;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  saved_foil_type: string | null;
  foil_score: number | null;
  foil_detection_method: FoilDetectionMethod | null;
  scanned_at: Date;
  captured_image_key: string | null;
  captured_image_data_url: string | null;
  catalog_image_url: string | null;
}

export interface AdminFoilLabelCountsRow {
  remaining: number;
  labelled_foil: number;
  labelled_not_foil: number;
}
