import {
  DECKLIST_COMMENT_PREFIXES,
  DECKLIST_LINE_PATTERN,
  DECKLIST_SECTION_HEADERS,
  PICK_LIST_FACE_SEPARATOR,
  PICK_LIST_MAX_ENTRIES,
  PICK_LIST_MAX_QUANTITY,
  PICK_LIST_NAME_MAX_LENGTH,
} from "./constants/pick-list.constant";
import { SCAN_RULE_FOIL_VALUE, SCAN_RULE_ROOT } from "./constants/scan-rule-fields.constant";
import type {
  PickList,
  PickListCard,
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

/** The printing data a scanned card carries for pick list matching. */
export function pickListCardOf(card: object): PickListCard {
  const root = (
    card as Record<string, { foil?: unknown } | undefined>
  )[SCAN_RULE_ROOT];
  const text = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value : null;
  const foil = root?.foil;
  return {
    name: text((card as { name?: unknown }).name) ?? "",
    setCode: text((card as { set?: unknown }).set),
    collectorNumber: text((card as { collectorNumber?: unknown }).collectorNumber),
    isFoil: foil === SCAN_RULE_FOIL_VALUE ? true : typeof foil === "string" ? false : null,
  };
}

/** Printing data with all optional fields actually set (never null). */
export interface PickListPrinting {
  name: string;
  setCode?: string;
  collectorNumber?: string;
  isFoil?: boolean;
}

function pickListCardMatch(card: PickListCard | string): PickListCard {
  return typeof card === "string" ? { name: card } : card;
}

/** The entry's printing data with empty fields left out. */
export function pickListEntryCard(entry: PickListEntry): PickListPrinting {
  const card: PickListPrinting = { name: entry.name };
  if (entry.setCode != null) card.setCode = entry.setCode;
  if (entry.collectorNumber != null)
    card.collectorNumber = entry.collectorNumber;
  if (entry.isFoil != null) card.isFoil = entry.isFoil;
  return card;
}

/** Identity of a pick list entry: name plus optional printing data. */
export function pickListEntryKey(entry: PickListCard): string {
  const key = (value: string | null | undefined): string =>
    value?.trim().toLowerCase() ?? "";
  return [
    pickListNameKey(entry.name),
    key(entry.setCode),
    key(entry.collectorNumber),
    entry.isFoil == null ? "" : entry.isFoil ? "foil" : "nonfoil",
  ].join("|");
}

/**
 * True when the scan's known printing contradicts the entry's: both sides
 * know the field and they differ. Such entries stay out of the match so an
 * unwanted printing falls through to the catch-all instead of filling a pick.
 */
function pickListEntryConflicts(entry: PickListEntry, card: PickListCard): boolean {
  const differs = (wanted?: string | null, scanned?: string | null): boolean =>
    wanted != null &&
    scanned != null &&
    wanted.trim().toLowerCase() !== scanned.trim().toLowerCase();
  if (differs(entry.setCode, card.setCode)) return true;
  if (differs(entry.collectorNumber, card.collectorNumber)) return true;
  return entry.isFoil != null && card.isFoil != null && entry.isFoil !== card.isFoil;
}

/**
 * How well a scanned card satisfies an entry: 1 for the name, more for
 * printing data that agrees. Conflicting entries are excluded by the caller.
 */
function pickListEntryScore(entry: PickListEntry, card: PickListCard): number {
  let score = 1;
  if (entry.setCode != null) {
    score +=
      card.setCode != null &&
      entry.setCode.trim().toLowerCase() === card.setCode.trim().toLowerCase()
        ? 2
        : -1;
  }
  if (entry.collectorNumber != null) {
    score +=
      card.collectorNumber != null &&
      entry.collectorNumber.trim().toLowerCase() ===
        card.collectorNumber.trim().toLowerCase()
        ? 2
        : -1;
  }
  if (entry.isFoil != null && card.isFoil != null) {
    score += entry.isFoil === card.isFoil ? 1 : -1;
  }
  return score;
}

function pickListNameMatches(entry: PickListEntry, name: string): boolean {
  const keys = new Set(cardPickListKeys(name));
  return cardPickListKeys(entry.name).some((key) => keys.has(key));
}

const DECKLIST_FOIL_SUFFIX_PATTERN = /\s*\*([a-z]+)\*\s*$/i;
const DECKLIST_BRACKET_SUFFIX_PATTERN = /\s*\[([^\]]*)\]\s*$/;
// Arena style keeps the collector number after the parens: "(ELD) 291"
const DECKLIST_PAREN_SUFFIX_PATTERN = /\s*\(([^)]*)\)\s*(?:([a-z0-9-]+))?\s*$/i;
const DECKLIST_HASH_SUFFIX_PATTERN = /\s*#([a-z0-9-]+)\s*$/i;

function parsePrintingTokens(content: string): {
  setCode?: string;
  collectorNumber?: string;
} {
  const trimmed = content.trim();
  if (!trimmed) return {};
  const separated = trimmed.match(/^([a-z0-9-]+)\s*(?:[:#]\s*([a-z0-9-]+))$/i);
  if (separated) {
    return { setCode: separated[1], collectorNumber: separated[2] };
  }
  const pair = trimmed.match(/^([a-z0-9-]+)\s+([a-z0-9-]+)$/i);
  if (pair && /\d/.test(pair[2])) {
    return { setCode: pair[1], collectorNumber: pair[2] };
  }
  return { setCode: trimmed };
}

/**
 * Peels printing annotations off the end of a decklist line: `[SET: 143]`
 * (Moxfield/MTGO), `(SET) 143` (Arena), `#143`, and `*F*` foil markers.
 * Anything peeled is kept as data instead of being dropped, so lines for
 * two printings of the same card stay separate entries.
 */
function extractPrintingSuffix(name: string): PickListPrinting {
  let rest = name.trim();
  let setCode: string | undefined;
  let collectorNumber: string | undefined;
  let isFoil: boolean | undefined;
  for (;;) {
    const foil = rest.match(DECKLIST_FOIL_SUFFIX_PATTERN);
    if (foil) {
      if (/^f/i.test(foil[1])) isFoil = true;
      rest = rest.slice(0, foil.index).trim();
      continue;
    }
    const bracket = rest.match(DECKLIST_BRACKET_SUFFIX_PATTERN);
    if (bracket) {
      const tokens = parsePrintingTokens(bracket[1]);
      if (tokens.setCode) setCode ??= tokens.setCode;
      if (tokens.collectorNumber) collectorNumber ??= tokens.collectorNumber;
      rest = rest.slice(0, bracket.index).trim();
      continue;
    }
    const paren = rest.match(DECKLIST_PAREN_SUFFIX_PATTERN);
    if (paren) {
      const tokens = parsePrintingTokens(paren[1]);
      if (tokens.setCode) setCode ??= tokens.setCode;
      if (tokens.collectorNumber) collectorNumber ??= tokens.collectorNumber;
      // only a digit-bearing trailing token is a collector number; words like
      // "promo" are variant labels and are dropped with the parens
      if (paren[2] && !collectorNumber && /\d/.test(paren[2])) {
        collectorNumber ??= paren[2];
      }
      rest = rest.slice(0, paren.index).trim();
      continue;
    }
    const hash = rest.match(DECKLIST_HASH_SUFFIX_PATTERN);
    if (hash && rest.slice(0, hash.index).trim()) {
      collectorNumber ??= hash[1];
      rest = rest.slice(0, hash.index).trim();
      continue;
    }
    const printing: PickListPrinting = { name: rest };
    if (setCode != null) printing.setCode = setCode;
    if (collectorNumber != null) printing.collectorNumber = collectorNumber;
    if (isFoil != null) printing.isFoil = isFoil;
    return printing;
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
    const key = pickListEntryKey({ ...entry, name });
    if (key.split("|")[0] === "") continue;
    const quantity = clampQuantity(Number(entry.quantity));
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = clampQuantity(existing.quantity + quantity);
      continue;
    }
    const fresh: PickListEntryInput = { name, quantity };
    if (entry.setCode != null) fresh.setCode = entry.setCode;
    if (entry.collectorNumber != null)
      fresh.collectorNumber = entry.collectorNumber;
    if (entry.isFoil != null) fresh.isFoil = entry.isFoil;
    merged.set(key, fresh);
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
    const match = line.match(DECKLIST_LINE_PATTERN);
    if (!match) continue;
    const printing = extractPrintingSuffix(match[2]);
    if (!printing.name) continue;
    entries.push({
      name: printing.name,
      quantity: match[1] ? Number(match[1]) : 1,
      setCode: printing.setCode,
      collectorNumber: printing.collectorNumber,
      isFoil: printing.isFoil,
    });
  }
  return normalizePickListEntries(entries);
}

export function formatDecklist(entries: PickListEntryInput[]): string {
  return entries
    .map((entry) => {
      let suffix = "";
      if (entry.setCode != null && entry.collectorNumber != null) {
        suffix = ` [${entry.setCode}: ${entry.collectorNumber}]`;
      } else if (entry.setCode != null) {
        suffix = ` [${entry.setCode}]`;
      } else if (entry.collectorNumber != null) {
        suffix = ` [#${entry.collectorNumber}]`;
      }
      return `${entry.quantity} ${entry.name}${suffix}${entry.isFoil ? " *F*" : ""}`;
    })
    .join("\n");
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
  card: PickListCard | string,
  pickList: PickList,
): PickListEntry | undefined {
  const wanted = pickListCardMatch(card);
  let best: PickListEntry | undefined;
  let bestScore = -Infinity;
  for (const entry of pickList.entries) {
    if (!pickListNameMatches(entry, wanted.name)) continue;
    if (pickListEntryConflicts(entry, wanted)) continue;
    const score = pickListEntryScore(entry, wanted);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

export function evaluatePickListBin(
  card: PickListCard | string,
  configs: BinConfig[],
): PickListMatch | null {
  const candidates = configs
    .filter((c) => isPickListBin(c) && !c.isDisabled)
    .sort((a, b) => a.binNumber - b.binNumber);
  for (const bin of candidates) {
    const pickList = bin.pickList!;
    const entry = findPickListEntry(card, pickList);
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
  card: PickListCard | string,
  delta: number,
): PickList | null {
  const wanted = pickListCardMatch(card);
  let index = pickList.entries.findIndex(
    (entry) => pickListEntryKey(entry) === pickListEntryKey(wanted),
  );
  if (index < 0) {
    // fall back to the name when the caller has no printing data
    index = pickList.entries.findIndex((entry) =>
      pickListNameMatches(entry, wanted.name),
    );
  }
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
    previous.map((entry) => [pickListEntryKey(entry), entry.found]),
  );
  return normalizePickListEntries(entries).map((entry) => ({
    ...entry,
    found: foundByKey.get(pickListEntryKey(entry)) ?? 0,
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
