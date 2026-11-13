import { STATS_NICE_STEPS } from "@/lib/constants/stats";

export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = STATS_NICE_STEPS.find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

export function indexAtX(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round((x / width) * (count - 1))));
}
