export function formatMatchDistance(value: number | null): string {
  return value == null ? "-" : value.toFixed(3);
}
