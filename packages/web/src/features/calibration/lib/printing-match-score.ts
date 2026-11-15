export function printingMatchScore(
  distance: number,
  distanceThreshold: number,
): number {
  if (!(distanceThreshold > 0)) return 0;
  const score = Math.round(100 * (1 - distance / distanceThreshold));
  return Math.min(100, Math.max(0, score));
}
