import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateScanId(): string {
  return crypto.randomUUID();
}

export function matchPercent(card: {
  distance: number;
  confidence?: number;
}): number {
  const score = card.confidence ?? 1 - card.distance;
  return Math.max(0, Math.min(100, score * 100));
}

export function sortByLabel<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}
