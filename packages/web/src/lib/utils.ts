import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateScanId(): string {
  return crypto.randomUUID();
}

// The raw cosine similarity as a percentage - distance 0 (a literal perfect
// match, which real scans essentially never hit) is 100%, distance 1 is 0%.
// Not scaled against a collection's accept/reject threshold: that's a
// separate concern (whether a candidate is shown at all) from how good an
// already-shown match actually is, and scaling against it either pinned
// almost every real match at 100% (anchoring "100%" short of the threshold)
// or crushed real matches into a narrow low range (scaling 0% to the
// threshold itself) depending on which anchor was tried.
export function matchPercentFromDistance(distance: number): number {
  return Math.max(0, Math.min(100, (1 - distance) * 100));
}
