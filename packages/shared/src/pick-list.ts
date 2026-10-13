import {
  DECKLIST_COMMENT_PREFIXES,
  DECKLIST_LINE_PATTERN,
  DECKLIST_PRINTING_SUFFIX_PATTERN,
  DECKLIST_SECTION_HEADERS,
  PICK_LIST_FACE_SEPARATOR,
  PICK_LIST_MAX_ENTRIES,
  PICK_LIST_MAX_QUANTITY,
  PICK_LIST_NAME_MAX_LENGTH,
} from "./constants/pick-list.constant";
import type {
  PickList,
  PickListEntry,
  PickListEntryInput,
  PickListMatch,
  PickListTotals,
} from "./interfaces/pick-list.interface";
import type { BinConfig } from "./interfaces/sort-bins.interface";

export function pickListNameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*\/{1,2}\s*/g, ` ${PICK_LIST_FACE_SEPARATOR} `)
    .replace(/\s+/g, " ")
    .trim();
}

export function cardPickListKeys(cardName: string): string[] {
  const full = pickListNameKey(cardName);
  const faces = full
    .split(PICK_LIST_FACE_SEPARATOR)
    .map((face) => face.trim())
    .filter(Boolean);
  return [full, ...faces];
}

function stripPrintingSuffix(name: string): string {
  let current = name.trim();
  for (;;) {
    const next = current.replace(DECKLIST_PRINTING_SUFFIX_PATTERN, "").trim();
    if (next === current || !next) return current;
    current = next;
  }
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(PICK_LIST_MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export function normalizePickListEntries(
  entries: PickListEntryInput[],
): PickListEntryInput[] {
  const merged = new Map<string, PickListEntryInput>();
  for (const entry of entries) {
    if (typeof entry?.name !== "string") continue;
    const name = entry.name.trim().slice(0, PICK_LIST_NAME_MAX_LENGTH);
    const key = pickListNameKey(name);
    if (!key) continue;
    const quantity = clampQuantity(Number(entry.quantity));
    const existing = merged.get(key);
    merged.set(
      key,
      existing
        ? { ...existing, quantity: clampQuantity(existing.quantity + quantity) }
        : { name, quantity },
    );
  }
  return [...merged.values()].slice(0, PICK_LIST_MAX_ENTRIES);
}

export function parseDecklist(text: string): PickListEntryInput[] {
  const entries: PickListEntryInput[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.endsWith(":")) continue;
    if (DECKLIST_COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      continue;
    }
    if (DECKLIST_SECTION_HEADERS.includes(line.toLowerCase())) continue;
    const match = DECKLIST_LINE_PATTERN.exec(line);
    if (!match) continue;
    const name = stripPrintingSuffix(match[2]);
    if (!name) continue;
    entries.push({ name, quantity: match[1] ? Number(match[1]) : 1 });
  }
  return normalizePickListEntries(entries);
}

export function formatDecklist(entries: PickListEntryInput[]): string {
  return entries.map((entry) => `${entry.quantity} ${entry.name}`).join("\n");
}

export function isPickListEntryComplete(
  entry: PickListEntry,
  pickList: Pick<PickList, "mode">,
): boolean {
  return pickList.mode === "until_found" && entry.found >= entry.quantity;
}

export function isPickListBin(config: BinConfig): boolean {
  return !config.isCatchAll && config.pickList != null;
}

export function isPickListComplete(pickList: PickList | null | undefined): boolean {
  return (
    !!pickList &&
    pickList.mode === "until_found" &&
    pickList.entries.length > 0 &&
    pickList.entries.every((entry) => entry.found >= entry.quantity)
  );
}

export function findPickListEntry(
  cardName: string,
  pickList: PickList,
): PickListEntry | undefined {
  const keys = new Set(cardPickListKeys(cardName));
  return pickList.entries.find((entry) =>
    keys.has(pickListNameKey(entry.name)),
  );
}

export function evaluatePickListBin(
  cardName: string,
  configs: BinConfig[],
): PickListMatch | null {
  const candidates = configs
    .filter((c) => isPickListBin(c) && !c.isDisabled)
    .sort((a, b) => a.binNumber - b.binNumber);
  for (const bin of candidates) {
    const pickList = bin.pickList!;
    const entry = findPickListEntry(cardName, pickList);
    if (entry && !isPickListEntryComplete(entry, pickList)) {
      return { bin, entry };
    }
  }
  return null;
}

export function reservePickListBins(configs: BinConfig[]): BinConfig[] {
  return configs.some(isPickListBin)
    ? configs.map((c) => (isPickListBin(c) ? { ...c, isDisabled: true } : c))
    : configs;
}

export function applyPickListFound(
  pickList: PickList,
  name: string,
  delta: number,
): PickList | null {
  const key = pickListNameKey(name);
  const index = pickList.entries.findIndex(
    (entry) => pickListNameKey(entry.name) === key,
  );
  if (index < 0) return null;
  const entry = pickList.entries[index];
  const found = entry.found + delta;
  if (found < 0) return null;
  if (delta > 0 && isPickListEntryComplete(entry, pickList)) return null;
  return {
    ...pickList,
    entries: pickList.entries.map((e, i) => (i === index ? { ...e, found } : e)),
  };
}

export function mergePickListEntries(
  entries: PickListEntryInput[],
  previous: PickListEntry[],
): PickListEntry[] {
  const foundByKey = new Map(
    previous.map((entry) => [pickListNameKey(entry.name), entry.found]),
  );
  return normalizePickListEntries(entries).map((entry) => ({
    ...entry,
    found: foundByKey.get(pickListNameKey(entry.name)) ?? 0,
  }));
}

export function toPickList(value: unknown): PickList | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<PickList>;
  return {
    mode: raw.mode === "all" ? "all" : "until_found",
    entries: Array.isArray(raw.entries) ? raw.entries : [],
  };
}

export function getPickListTotals(pickList: PickList): PickListTotals {
  const untilFound = pickList.mode === "until_found";
  return pickList.entries.reduce<PickListTotals>(
    (totals, entry) => ({
      wanted: totals.wanted + entry.quantity,
      found:
        totals.found +
        (untilFound ? Math.min(entry.found, entry.quantity) : entry.found),
    }),
    { wanted: 0, found: 0 },
  );
}
