import {
  MATCH_VALIDATION_REVIEWS_REQUIRED,
  type MatchValidationGameProgress,
} from "@magic-vault/shared";
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
        Number(second.lowConfidenceMatch) - Number(first.lowConfidenceMatch) ||
        reviewCountOf(second) - reviewCountOf(first),
    )
    .slice(0, limit);
}

export function candidatesForGame(
  candidates: MatchValidationCandidate[],
  gameKey: string | undefined,
): MatchValidationCandidate[] {
  return gameKey
    ? candidates.filter((candidate) => candidate.gameKey === gameKey)
    : candidates;
}

export function reviewProgressOf(
  candidates: MatchValidationCandidate[],
  votes: MatchValidationVotes,
): number {
  return candidates.reduce(
    (sum, candidate) =>
      sum +
      Math.min(
        votes.byScanId.get(candidate.scanId)?.review_count ?? 0,
        MATCH_VALIDATION_REVIEWS_REQUIRED,
      ),
    0,
  );
}

export function gameProgressOf(
  candidates: MatchValidationCandidate[],
  votes: MatchValidationVotes,
): MatchValidationGameProgress[] {
  const candidatesByGame = new Map<string, MatchValidationCandidate[]>();
  for (const candidate of candidates) {
    if (!candidate.gameKey) continue;
    const gameCandidates = candidatesByGame.get(candidate.gameKey) ?? [];
    gameCandidates.push(candidate);
    candidatesByGame.set(candidate.gameKey, gameCandidates);
  }
  return [...candidatesByGame.entries()]
    .map(([gameKey, gameCandidates]) => ({
      gameKey,
      gameName: gameCandidates[0].gameName ?? gameKey,
      scanCount: gameCandidates.length,
      reviewCount: reviewProgressOf(gameCandidates, votes),
    }))
    .sort((first, second) => first.gameName.localeCompare(second.gameName));
}
