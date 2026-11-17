export interface OrderLineCandidateDemand {
  normalizedName: string;
  missing: number;
}

export interface OrderLineCandidateRequest {
  line_index: number;
  name: string;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  condition: string | null;
  is_foil: boolean | null;
  candidate_limit: number;
}

export interface OrderLineCandidateRow {
  line_index: number;
  scan_id: string;
}
