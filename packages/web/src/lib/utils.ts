import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateScanId(): string {
  return crypto.randomUUID();
}

// Prefers the server's margin-based confidence (see findCardMatches). Falls
// back to raw cosine similarity for scans saved before confidence existed and
// for manual picks, which carry distance 0. Deliberately not scaled against a
// collection's accept/reject threshold: anchoring 100% short of the threshold
// pinned almost every real match at 100%, and anchoring 0% at it crushed real
// matches into a narrow low range.
export function matchPercent(card: {
  distance: number;
  confidence?: number;
}): number {
  const score = card.confidence ?? 1 - card.distance;
  return Math.max(0, Math.min(100, score * 100));
}
