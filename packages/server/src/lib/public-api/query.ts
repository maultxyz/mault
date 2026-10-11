import {
  apiListCardsQuerySchema,
  apiLocationCardsQuerySchema,
  PUBLIC_API_PAGE_SIZE_DEFAULT,
} from "@magic-vault/shared";
import type {
  PublicApiCardCursor,
  PublicApiCardFilters,
  PublicApiLocationCardFilters,
  PublicApiLocationCursor,
} from "../interfaces/public-api";
import { decodeCursor, parsePublicApiInput } from "./pagination";

function trimmedOrNull(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function toLimit(value: string | undefined): number {
  return value === undefined ? PUBLIC_API_PAGE_SIZE_DEFAULT : Number(value);
}

export function toCardFilters(
  query: Record<string, string>,
): PublicApiCardFilters {
  const input = parsePublicApiInput(apiListCardsQuerySchema, query);
  const cardIds = [
    ...new Set(
      (input.card_id ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  return {
    since: input.since ? new Date(input.since).toISOString() : null,
    cursor: decodeCursor<PublicApiCardCursor>(
      input.cursor,
      (cursor) =>
        Number.isInteger(cursor.i) &&
        (cursor.t === undefined || typeof cursor.t === "string"),
    ),
    limit: toLimit(input.limit),
    collectionGuid: input.collection ?? null,
    inStorage:
      input.in_storage === undefined ? null : input.in_storage === "true",
    cardIds: cardIds.length ? cardIds : null,
    name: trimmedOrNull(input.name),
    set: trimmedOrNull(input.set),
    collectorNumber: trimmedOrNull(input.collector_number),
    foil: input.finish === undefined ? null : input.finish === "foil",
  };
}

export function toLocationCardFilters(
  query: Record<string, string>,
): PublicApiLocationCardFilters {
  const input = parsePublicApiInput(apiLocationCardsQuerySchema, query);
  return {
    cursor: decodeCursor<PublicApiLocationCursor>(
      input.cursor,
      (cursor) => Number.isInteger(cursor.p) && Number.isInteger(cursor.i),
    ),
    limit: toLimit(input.limit),
  };
}
