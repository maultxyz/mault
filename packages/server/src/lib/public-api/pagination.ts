import { sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import type { Transaction } from "../../db";
import {
  PUBLIC_API_CHANGE_OVERLAP_SECONDS,
  PUBLIC_API_TIMESTAMP_FORMAT,
} from "../constants/api-keys";

export class PublicApiInputError extends Error {}

export function parsePublicApiInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue?.path.join(".");
  throw new PublicApiInputError(
    field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input."),
  );
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
