import { CONSENSUS_MAX_VOTE_DISTANCE } from "./constants/scanner.constant";
import type { PlayingCardWithDistance } from "./interfaces/card.interface";

export function pickConsensus<
  T extends { card: PlayingCardWithDistance | null },
>(attempts: T[], matchesNeeded: number): T | null {
  const votes = new Map<string, T[]>();
  for (const attempt of attempts) {
    const card = attempt.card;
    if (!card || card.distance > CONSENSUS_MAX_VOTE_DISTANCE) continue;
    votes.set(card.name, [...(votes.get(card.name) ?? []), attempt]);
  }
  for (const group of votes.values()) {
    if (group.length < matchesNeeded) continue;
    return group.reduce((best, attempt) =>
      attempt.card!.distance < best.card!.distance ? attempt : best,
    );
  }
  return null;
}
