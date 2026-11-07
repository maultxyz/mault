import { z } from "zod";
import {
  EMPTY_STORED_STORAGE_PICK_LIST,
  EMPTY_STORED_STORAGE_VERIFY,
} from "./constants/storage-pick-list.constant";
import type { PickListEntryInput } from "./interfaces/pick-list.interface";
import type { PickListEntry } from "./interfaces/pick-list.interface";
import type {
  ScanCheckCard,
  ScanCheckMatch,
  StorageLocationSearchResult,
  StoragePickListRow,
  StorageVerifyNameCount,
  StoredStoragePickList,
  StoredStorageVerify,
} from "./interfaces/storage-locations.interface";
import { cardPickListKeys, normalizePickListEntries, parseDecklist } from "./pick-list";

const storedStoragePickListSchema = z.object({
  decklist: z.string(),
  pickedScanIds: z.array(z.string()),
});

const storedStorageVerifySchema = z.object({
  verifiedScanIds: z.array(z.string()),
  notInLocationCardNames: z.array(z.string()),
});

function parseStoredJson<T>(raw: string | null | undefined, schema: z.ZodType<T>, empty: T): T {
  if (!raw) return empty;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : empty;
  } catch {
    return empty;
  }
}

export function storagePickListEntries(decklist: string): PickListEntryInput[] {
  return normalizePickListEntries(parseDecklist(decklist));
}

export function parseStoredStoragePickList(raw: string | null | undefined): StoredStoragePickList {
  return parseStoredJson(raw, storedStoragePickListSchema, EMPTY_STORED_STORAGE_PICK_LIST);
}

export function parseStoredStorageVerify(raw: string | null | undefined): StoredStorageVerify {
  return parseStoredJson(raw, storedStorageVerifySchema, EMPTY_STORED_STORAGE_VERIFY);
}

function findCardForScanIn<T extends ScanCheckCard>(cards: T[], scannedCard: { id: string; name: string }): T | null {
  const samePrinting = cards.find((card) => card.card.id === scannedCard.id);
  if (samePrinting) return samePrinting;
  const scannedKeys = new Set(cardPickListKeys(scannedCard.name));
  return cards.find((card) => cardPickListKeys(card.card.name).some((key) => scannedKeys.has(key))) ?? null;
}

export function findCardForScan<T extends ScanCheckCard>(
  cards: T[],
  checkedScanIds: ReadonlySet<string>,
  scannedCard: { id: string; name: string },
): ScanCheckMatch<T> | null {
  const unchecked = findCardForScanIn(
    cards.filter((card) => !checkedScanIds.has(card.scanId)),
    scannedCard,
  );
  if (unchecked) return { kind: "unchecked", card: unchecked };
  const checked = findCardForScanIn(
    cards.filter((card) => checkedScanIds.has(card.scanId)),
    scannedCard,
  );
  return checked ? { kind: "already-checked", card: checked } : null;
}

function mostCommonCollectionGuid(cards: ScanCheckCard[]): string | null {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.collectionGuid, (counts.get(card.collectionGuid) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [collectionGuid, count] of counts) {
    if (count > bestCount) {
      best = collectionGuid;
      bestCount = count;
    }
  }
  return best;
}

export function scanCheckCollectionGuid(
  cards: ScanCheckCard[],
  checkedScanIds: ReadonlySet<string>,
): string | null {
  return (
    mostCommonCollectionGuid(cards.filter((card) => !checkedScanIds.has(card.scanId))) ??
    mostCommonCollectionGuid(cards)
  );
}

export function storagePickListRows(
  lines: PickListEntry[],
  cards: StorageLocationSearchResult[],
  pickedScanIds: ReadonlySet<string>,
): StoragePickListRow[] {
  const toRow = (entry: StorageLocationSearchResult): StoragePickListRow => ({
    kind: "card",
    entry,
    isPicked: pickedScanIds.has(entry.scanId),
  });
  const cardRows = cards.map(toRow);
  const missingRows: StoragePickListRow[] = lines
    .filter((line) => line.found < line.quantity)
    .map((line) => ({ kind: "missing", line, missingCount: line.quantity - line.found }));
  return [
    ...cardRows.filter((row) => row.kind === "card" && !row.isPicked),
    ...missingRows,
    ...cardRows.filter((row) => row.kind === "card" && row.isPicked),
  ];
}

export function storageVerifyNameCounts(names: string[]): StorageVerifyNameCount[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}
