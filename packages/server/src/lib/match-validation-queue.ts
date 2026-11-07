import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import type {
  MatchValidationCandidate,
  MatchValidationVotes,
} from "./interfaces/match-validations";

export function pickMatchValidationQueue(
  candidates: MatchValidationCandidate[],
  votes: MatchValidationVotes,
  limit: number,
): MatchValidationCandidate[] {
  const reviewCountOf = (candidate: MatchValidationCandidate) =>
    votes.byScanId.get(candidate.scanId)?.review_count ?? 0;
  return candidates
    .filter(
      (candidate) =>
        reviewCountOf(candidate) < MATCH_VALIDATION_REVIEWS_REQUIRED &&
        !votes.byScanId.get(candidate.scanId)?.your_verdict,
    )
    .sort(
      (first, second) =>
        reviewCountOf(second) - reviewCountOf(first) ||
        Number(second.lowConfidenceMatch) - Number(first.lowConfidenceMatch),
    )
    .slice(0, limit);
}
