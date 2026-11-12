import type { MatchValidationVerdict } from "../interfaces/match-validations.interface";

export const MATCH_VALIDATION_REVIEWS_REQUIRED = 2;
export const MATCH_VALIDATION_TOP_ORG_COUNT = 3;

export const MATCH_VALIDATION_VERDICTS: readonly MatchValidationVerdict[] = [
  "correct",
  "incorrect",
  "badScan",
];
export const MATCH_VALIDATION_PROGRESS_MAX_AGE_MS = 5 * 60 * 1000;
