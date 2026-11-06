import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "./constants/match-validations.constant";
import type {
  MatchValidationStatus,
  MatchValidationVerdictCounts,
} from "./interfaces/match-validations.interface";

export function matchValidationStatus({
  correctCount,
  incorrectCount,
  badScanCount,
}: MatchValidationVerdictCounts): MatchValidationStatus {
  if (correctCount + incorrectCount + badScanCount < MATCH_VALIDATION_REVIEWS_REQUIRED) {
    return "inProgress";
  }
  if (correctCount >= MATCH_VALIDATION_REVIEWS_REQUIRED) return "correct";
  if (incorrectCount >= MATCH_VALIDATION_REVIEWS_REQUIRED) return "incorrect";
  if (badScanCount >= MATCH_VALIDATION_REVIEWS_REQUIRED) return "badScan";
  return "disputed";
}
