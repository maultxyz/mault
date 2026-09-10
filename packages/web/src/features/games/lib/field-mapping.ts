import type { PickedField } from "@/lib/interfaces/games";
import type { FieldType } from "@magic-vault/shared";

export type { PickedField };

export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function pathToFieldKey(path: string): string {
  return path.replace(/[.\-\s]+/g, "_").toLowerCase();
}

export function inferFieldType(value: unknown): FieldType {
  if (typeof value === "number") return "numeric";
  if (Array.isArray(value)) return "set";
  return "string";
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isObjectArray(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.some((v) => v !== null && typeof v === "object")
  );
}

// Avoids clobbering an existing row when the same leaf gets picked twice, or
// two different leaves humanize to the same field key.
export function uniqueFieldKey(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
