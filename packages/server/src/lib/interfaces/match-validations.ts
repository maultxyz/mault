import type {
  MatchValidationVerdict,
  OcrReadRegion,
  PlayingCard,
  ScanMatchSource,
} from "@magic-vault/shared";

export interface MatchValidationQueueRow {
  scan_id: string;
  game_key: string | null;
  card_name: string | null;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  matched_by: ScanMatchSource | null;
  low_confidence_match: boolean;
  scanned_at: Date;
  captured_image_key: string | null;
  captured_image_data_url: string | null;
  catalog_image_url: string | null;
  card: PlayingCard;
  collection_lang: string;
  ocr_regions: OcrReadRegion[] | null;
  review_count: number;
}

export interface MatchValidationTotalRow {
  total: number;
}

export interface MatchValidationScanRow {
  scan_id: string;
  card_name: string | null;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  scanned_at: Date;
  captured_image_key: string | null;
  captured_image_data_url: string | null;
  catalog_image_url: string | null;
  correct_count: number;
  incorrect_count: number;
  bad_scan_count: number;
  your_verdict: MatchValidationVerdict | null;
}

export interface MatchValidationProgressRow {
  scan_count: number;
  review_count: number;
}

export interface MatchValidationCountsRow {
  validated_by_you: number;
  validated_by_community: number;
}
