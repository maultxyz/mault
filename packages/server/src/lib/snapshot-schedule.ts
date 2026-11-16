function utcDayOf(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function isSnapshotDue(
  lastSnapshotAt: number | undefined,
  now: number,
  minimumIntervalMs: number,
): boolean {
  return (
    lastSnapshotAt === undefined ||
    utcDayOf(lastSnapshotAt) !== utcDayOf(now) ||
    now - lastSnapshotAt >= minimumIntervalMs
  );
}
