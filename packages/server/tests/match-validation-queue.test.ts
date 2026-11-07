import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  MatchValidationVoteRow,
  MatchValidationVotes,
} from "../src/lib/interfaces/match-validations";
import { pickMatchValidationQueue } from "../src/lib/match-validation-queue";

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

test("the match validation queue skips finished and already-voted scans and puts half-reviewed ones first", () => {
  const candidates = [
    { scanId: "newest", lowConfidenceMatch: false },
    { scanId: "low-confidence", lowConfidenceMatch: true },
    { scanId: "one-review", lowConfidenceMatch: false },
    { scanId: "finished", lowConfidenceMatch: true },
    { scanId: "you-voted", lowConfidenceMatch: true },
    { scanId: "oldest", lowConfidenceMatch: false },
  ];
  const votes = votesFor([
    { scan_id: "one-review", review_count: 1 },
    { scan_id: "finished", review_count: 2 },
    { scan_id: "you-voted", review_count: 1, your_verdict: "correct" },
  ]);
  assert.deepEqual(
    pickMatchValidationQueue(candidates, votes, 3).map((candidate) => candidate.scanId),
    ["one-review", "low-confidence", "newest"],
  );
});
