import {
  PUBLIC_API_CARD_ID_FILTER_MAX,
  PUBLIC_API_PAGE_SIZE_DEFAULT,
  PUBLIC_API_PAGE_SIZE_MAX,
} from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../../db";
import {
  PUBLIC_API_CHANGE_OVERLAP_SECONDS,
  PUBLIC_API_TIMESTAMP_FORMAT,
} from "../constants/api-keys";
import { UUID_PATTERN } from "../constants/validation";

export class PublicApiInputError extends Error {}

export function parsePageLimit(value: string | undefined): number {
  if (value === undefined || value === "") return PUBLIC_API_PAGE_SIZE_DEFAULT;
  const limit = Number(value);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > PUBLIC_API_PAGE_SIZE_MAX
  ) {
    throw new PublicApiInputError(
      `limit must be a whole number from 1 to ${PUBLIC_API_PAGE_SIZE_MAX}.`,
    );
  }
  return limit;
}

export function parseSince(value: string | undefined): string | null {
  if (value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PublicApiInputError(
      "since must be an ISO 8601 timestamp, e.g. 2026-10-09T12:00:00Z.",
    );
  }
  return date.toISOString();
}

export function parseBooleanParam(
  name: string,
  value: string | undefined,
): boolean | null {
  if (value === undefined || value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new PublicApiInputError(`${name} must be true or false.`);
}

export function parseGuidParam(
  name: string,
  value: string | undefined,
): string | null {
  if (value === undefined || value === "") return null;
  if (!UUID_PATTERN.test(value)) {
    throw new PublicApiInputError(`${name} is not a valid id.`);
  }
  return value;
}

export function parseTextParam(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

export function parseCardIds(value: string | undefined): string[] | null {
  const ids = [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (ids.length === 0) return null;
  if (ids.length > PUBLIC_API_CARD_ID_FILTER_MAX) {
    throw new PublicApiInputError(
      `cardId takes at most ${PUBLIC_API_CARD_ID_FILTER_MAX} ids.`,
    );
  }
  return ids;
}

export function encodeCursor(cursor: object): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor<T extends object>(
  value: string | undefined,
  isValid: (cursor: Record<string, unknown>) => boolean,
): T | null {
  if (value === undefined || value === "") return null;
  let cursor: unknown;
  try {
    cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new PublicApiInputError("cursor is invalid.");
  }
  if (
    !cursor ||
    typeof cursor !== "object" ||
    !isValid(cursor as Record<string, unknown>)
  ) {
    throw new PublicApiInputError("cursor is invalid.");
  }
  return cursor as T;
}

export function sinceSql(since: string): SQL {
  return sql`(${since}::timestamptz AT TIME ZONE 'UTC')`;
}

export function isoTimestampSql(column: SQL): SQL<string> {
  return sql<string>`to_char(${column}, ${PUBLIC_API_TIMESTAMP_FORMAT})`;
}

export async function loadNextSince(tx: Transaction): Promise<string> {
  const result = await tx.execute(sql`
    SELECT ${isoTimestampSql(
      sql`(now() AT TIME ZONE 'UTC') - make_interval(secs => ${PUBLIC_API_CHANGE_OVERLAP_SECONDS})`,
    )} AS next_since
  `);
  return (result.rows[0] as { next_since: string }).next_since;
}
