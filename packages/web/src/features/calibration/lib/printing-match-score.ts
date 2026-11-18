import { PRINTING_MATCH_SCORE_ANCHORS } from "@/lib/constants/calibration";

export function printingMatchScore(
  distance: number,
  distanceThreshold: number,
): number {
  if (!(distanceThreshold > 0) || !Number.isFinite(distance)) return 0;
  const share = Math.max(0, distance / distanceThreshold);
  const upperIndex = PRINTING_MATCH_SCORE_ANCHORS.findIndex(
    (anchor) => share <= anchor.distanceShareOfThreshold,
  );
  if (upperIndex === -1) return 0;
  if (upperIndex === 0) return PRINTING_MATCH_SCORE_ANCHORS[0].score;
  const lower = PRINTING_MATCH_SCORE_ANCHORS[upperIndex - 1];
  const upper = PRINTING_MATCH_SCORE_ANCHORS[upperIndex];
  const position =
    (share - lower.distanceShareOfThreshold) /
    (upper.distanceShareOfThreshold - lower.distanceShareOfThreshold);
  return Math.round(lower.score + (upper.score - lower.score) * position);
}
