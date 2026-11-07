import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  MatchValidationVoteRow,
  MatchValidationVotes,
} from "../src/lib/interfaces/match-validations";
import {
  gameProgressOf,
  pickMatchValidationQueue,
} from "../src/lib/match-validation-queue";

function votesFor(rows: Partial<MatchValidationVoteRow>[]): MatchValidationVotes {
  const byScanId = new Map(
    rows.map((row) => [
      row.scan_id!,
      {
        scan_id: row.scan_id!,
        review_count: row.review_count ?? 1,
        correct_count: 0,
        incorrect_count: 0,
        bad_scan_count: 0,
        your_verdict: row.your_verdict ?? null,
      },
    ]),
  );
  return { byScanId, validatedByYou: 0, validatedByCommunity: 0 };
}

test("the match validation queue skips finished and already-voted scans and puts low confidence matches first, then half-reviewed ones", () => {
  const candidates = [
    { scanId: "newest", lowConfidenceMatch: false, gameKey: "mtg", gameName: "Magic" },
    { scanId: "low-confidence", lowConfidenceMatch: true, gameKey: "mtg", gameName: "Magic" },
    { scanId: "one-review", lowConfidenceMatch: false, gameKey: "mtg", gameName: "Magic" },
    { scanId: "finished", lowConfidenceMatch: true, gameKey: "mtg", gameName: "Magic" },
    { scanId: "you-voted", lowConfidenceMatch: true, gameKey: "mtg", gameName: "Magic" },
    { scanId: "oldest", lowConfidenceMatch: false, gameKey: "mtg", gameName: "Magic" },
  ];
  const votes = votesFor([
    { scan_id: "one-review", review_count: 1 },
    { scan_id: "finished", review_count: 2 },
    { scan_id: "you-voted", review_count: 1, your_verdict: "correct" },
  ]);
  assert.deepEqual(
    pickMatchValidationQueue(candidates, votes, 3).map((candidate) => candidate.scanId),
    ["low-confidence", "one-review", "newest"],
  );
});

test("match validation progress is broken down by game, capping each scan at the reviews it needs", () => {
  const candidates = [
    { scanId: "magic-1", lowConfidenceMatch: false, gameKey: "mtg", gameName: "Magic" },
    { scanId: "magic-2", lowConfidenceMatch: false, gameKey: "mtg", gameName: "Magic" },
    { scanId: "lorcana-1", lowConfidenceMatch: false, gameKey: "lorcana", gameName: "Lorcana" },
  ];
  const votes = votesFor([
    { scan_id: "magic-1", review_count: 5 },
    { scan_id: "lorcana-1", review_count: 1 },
  ]);
  assert.deepEqual(gameProgressOf(candidates, votes), [
    { gameKey: "lorcana", gameName: "Lorcana", scanCount: 1, reviewCount: 1 },
    { gameKey: "mtg", gameName: "Magic", scanCount: 2, reviewCount: 2 },
  ]);
});
