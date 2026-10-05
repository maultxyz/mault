export const CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS = [
  3, 5, 10, 15, 30,
] as const;

export const DEFAULT_CORRECTION_AUTO_CLOSE_SECONDS = 5;

export function toCorrectionAutoCloseSeconds(value: unknown): number | null {
  return typeof value === "number" &&
    (CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS as readonly number[]).includes(value)
    ? value
    : null;
}
