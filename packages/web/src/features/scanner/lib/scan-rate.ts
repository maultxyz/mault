export function bucketScanTimes(
  times: number[],
  now: number,
  bucketMs: number,
  bucketCount: number,
): number[] {
  const buckets = new Array<number>(bucketCount).fill(0);
  const start = now - bucketMs * bucketCount;
  for (const time of times) {
    if (time <= start || time > now) continue;
    const index = Math.min(
      bucketCount - 1,
      Math.floor((time - start) / bucketMs),
    );
    buckets[index] += 1;
  }
  return buckets;
}
