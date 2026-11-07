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
}

export interface MatchValidationCandidate {
  scanId: string;
  lowConfidenceMatch: boolean;
}

export interface MatchValidationCandidateRow {
  scan_id: string;
  low_confidence_match: boolean;
}

export interface MatchValidationVoteRow {
  scan_id: string;
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  bad_scan_count: number;
  your_verdict: MatchValidationVerdict | null;
}

export interface MatchValidationValidatorOrgRow {
  validator_org_id: string | null;
  user_id: string;
  review_count: number;
}

export interface MatchValidationVotes {
  byScanId: Map<string, MatchValidationVoteRow>;
  validatedByYou: number;
  validatedByCommunity: number;
}
