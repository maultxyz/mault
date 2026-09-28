import type { ScannedCard } from "./interfaces/scanner.interface";
import type {
  AlphabetStep,
  BinCondition,
  BinConfig,
  BinRuleGroup,
  BinSet,
  FieldMeta,
  RepackSlot,
} from "./interfaces/sort-bins.interface";
import { isRuleGroup } from "./interfaces/sort-bins.interface";
import {
  ALPHABET_LETTERS,
  ALPHABET_PREFIX_MAX_LENGTH,
} from "./constants/sort-bins.constant";

export type SourceCard = object;

export function getByPath(card: SourceCard, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, card);
}

function getRawRoot(card: SourceCard): SourceCard | undefined {
  const raw = (card as { raw?: unknown }).raw;
  return raw && typeof raw === "object" ? (raw as SourceCard) : undefined;
}

export function getCardValue(
  card: SourceCard,
  field: BinCondition["field"],
  fieldDefinitions: FieldMeta[],
): string | number | string[] | null {
  const meta = fieldDefinitions.find((f) => f.field === field);
  if (!meta) return "";

  const rawRoot = getRawRoot(card);
  const rawValue = rawRoot ? getByPath(rawRoot, meta.path) : undefined;
  const value = rawValue !== undefined ? rawValue : getByPath(card, meta.path);

  if (meta.type === "numeric") {
    if (typeof value === "number") return value;
    if (value === undefined || value === null) return null;
    const parsed = parseFloat(String(value));
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (Array.isArray(value)) return value as string[];
  return value === undefined || value === null
    ? ""
    : (value as string | number);
}

function isNullish(value: string | number | string[] | null): boolean {
  if (value === null) return true;
  if (typeof value === "string") return value === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function evaluateCondition(
  card: SourceCard,
  condition: BinCondition,
  fieldDefinitions: FieldMeta[],
): boolean {
  const cardValue = getCardValue(card, condition.field, fieldDefinitions);
  const { operator, value } = condition;

  switch (operator) {
    case "equals":
      if (Array.isArray(cardValue) && Array.isArray(value)) {
        return (
          cardValue.length === value.length &&
          cardValue.every((v) => value.includes(v)) &&
          value.every((v) => cardValue.includes(v))
        );
      }
      return String(cardValue) === String(value);

    case "not_equals":
      if (Array.isArray(cardValue) && Array.isArray(value)) {
        return !(
          cardValue.length === value.length &&
          cardValue.every((v) => value.includes(v)) &&
          value.every((v) => cardValue.includes(v))
        );
      }
      return String(cardValue) !== String(value);

    case "contains":
      return String(cardValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());

    case "not_contains":
      return !String(cardValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());

    case "starts_with":
      return String(cardValue)
        .toLowerCase()
        .startsWith(String(value).toLowerCase());

    case "ends_with":
      return String(cardValue)
        .toLowerCase()
        .endsWith(String(value).toLowerCase());

    case "gt":
      return cardValue !== null && Number(cardValue) > Number(value);

    case "gte":
      return cardValue !== null && Number(cardValue) >= Number(value);

    case "lt":
      return cardValue !== null && Number(cardValue) < Number(value);

    case "lte":
      return cardValue !== null && Number(cardValue) <= Number(value);

    case "is_null":
      return isNullish(cardValue);

    case "is_not_null":
      return !isNullish(cardValue);

    case "in":
      return Array.isArray(value) && value.includes(String(cardValue));

    case "not_in":
      return Array.isArray(value) && !value.includes(String(cardValue));

    case "contains_any":
      return (
        Array.isArray(cardValue) &&
        Array.isArray(value) &&
        value.some((v) => cardValue.includes(v))
      );

    case "contains_all":
      return (
        Array.isArray(cardValue) &&
        Array.isArray(value) &&
        value.every((v) => cardValue.includes(v))
      );

    case "contains_none":
      return (
        Array.isArray(cardValue) &&
        Array.isArray(value) &&
        !value.some((v) => cardValue.includes(v))
      );

    default:
      return false;
  }
}

export function evaluateRuleGroup(
  card: SourceCard,
  group: BinRuleGroup,
  fieldDefinitions: FieldMeta[],
): boolean {
  if (group.conditions.length === 0) return false;

  const results = group.conditions.map((item) =>
    isRuleGroup(item)
      ? evaluateRuleGroup(card, item, fieldDefinitions)
      : evaluateCondition(card, item, fieldDefinitions),
  );

  return group.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean);
}

export function getCatchAllBin(configs: BinConfig[]): BinConfig | undefined {
  return configs.find((c) => c.isCatchAll);
}

export function evaluateCardBin(
  card: SourceCard,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
): BinConfig | undefined {
  let catchAll: BinConfig | undefined;
  let firstMatch: BinConfig | undefined;

  for (const config of configs) {
    if (config.isCatchAll) {
      catchAll = config;
      continue;
    }
    if (
      config.rules.conditions.length > 0 &&
      evaluateRuleGroup(card, config.rules, fieldDefinitions)
    ) {
      if (config.isOverride) return config;
      firstMatch ??= config;
    }
  }

  return firstMatch ?? catchAll;
}

export function countCardsInBin(
  cards: Pick<ScannedCard, "binNumber" | "scannedAt">[],
  bin: Pick<BinConfig, "binNumber" | "lastEmptiedAt">,
): number {
  return cards.filter(
    (c) =>
      c.binNumber === bin.binNumber &&
      (bin.lastEmptiedAt == null || c.scannedAt > bin.lastEmptiedAt),
  ).length;
}

export function isBinFull(
  cards: Pick<ScannedCard, "binNumber" | "scannedAt">[],
  bin: Pick<BinConfig, "binNumber" | "lastEmptiedAt" | "cardLimit">,
): boolean {
  if (bin.cardLimit == null) return false;
  return countCardsInBin(cards, bin) >= bin.cardLimit;
}

export function computeBinCapacity(
  height: number | null | undefined,
  cardThickness: number | null | undefined,
  manualCardLimit: number | null | undefined,
): number | null {
  const calculated =
    height && cardThickness ? Math.floor(height / cardThickness) : null;
  return calculated ?? manualCardLimit ?? null;
}

export function getCardsInBin(
  cards: { binNumber?: number | null; scannedAt: number; card: SourceCard }[],
  bin: Pick<BinConfig, "binNumber" | "lastEmptiedAt">,
): SourceCard[] {
  return cards
    .filter(
      (c) =>
        c.binNumber === bin.binNumber &&
        (bin.lastEmptiedAt == null || c.scannedAt > bin.lastEmptiedAt),
    )
    .map((c) => c.card);
}

export function countSlotMatches(
  cards: SourceCard[],
  slot: RepackSlot,
  fieldDefinitions: FieldMeta[],
): number {
  return cards.filter((c) => evaluateRuleGroup(c, slot.rule, fieldDefinitions))
    .length;
}

export function isRepackComplete(
  slots: RepackSlot[],
  fieldDefinitions: FieldMeta[],
  cardsInPack: SourceCard[],
): boolean {
  if (slots.length === 0) return false;
  return slots.every(
    (slot) =>
      slot.targetCount > 0 &&
      countSlotMatches(cardsInPack, slot, fieldDefinitions) >= slot.targetCount,
  );
}

function isDuplicateInPack(
  card: SourceCard,
  cardsInPack: SourceCard[],
): boolean {
  const id = (card as { id?: unknown }).id;
  return (
    id != null && cardsInPack.some((c) => (c as { id?: unknown }).id === id)
  );
}

export function evaluateRepackBin(
  card: SourceCard,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  binSet: Pick<BinSet, "repackSlots" | "repackAllowDuplicates">,
  cardsInBin: (bin: BinConfig) => SourceCard[],
): BinConfig | undefined {
  const catchAll = getCatchAllBin(configs);

  for (const bin of configs) {
    if (bin.isCatchAll) continue;

    const cardsInPack = cardsInBin(bin);
    if (isRepackComplete(binSet.repackSlots, fieldDefinitions, cardsInPack)) {
      continue;
    }
    if (!binSet.repackAllowDuplicates && isDuplicateInPack(card, cardsInPack)) {
      continue;
    }

    const openSlot = binSet.repackSlots.find(
      (slot) =>
        slot.targetCount > 0 &&
        slot.rule.conditions.length > 0 &&
        evaluateRuleGroup(card, slot.rule, fieldDefinitions) &&
        countSlotMatches(cardsInPack, slot, fieldDefinitions) <
          slot.targetCount,
    );
    if (openSlot) return bin;
  }

  return catchAll;
}

export function getAlphabetBins(configs: BinConfig[]): BinConfig[] {
  return configs
    .filter((c) => !c.isCatchAll)
    .sort((a, b) => a.binNumber - b.binNumber);
}

export function getAlphabetPassCount(configs: BinConfig[]): number {
  const binCount = getAlphabetBins(configs).length;
  return binCount === 0 ? 0 : Math.ceil(ALPHABET_LETTERS.length / binCount);
}

export function clampAlphabetPass(configs: BinConfig[], pass: number): number {
  const passCount = getAlphabetPassCount(configs);
  return Math.min(Math.max(pass, 0), Math.max(passCount - 1, 0));
}

export function normalizeAlphabetPrefix(prefix: string): string {
  return toAlphabetSortKey(prefix).slice(0, ALPHABET_PREFIX_MAX_LENGTH);
}

function shiftLastLetter(prefix: string, offset: number): string | null {
  if (prefix.length === 0) return null;
  const index = ALPHABET_LETTERS.indexOf(prefix.charAt(prefix.length - 1));
  const letter = ALPHABET_LETTERS[index + offset];
  return letter ? prefix.slice(0, -1) + letter : null;
}

export function getNextAlphabetStep(
  configs: BinConfig[],
  step: AlphabetStep,
): AlphabetStep | null {
  const pass = clampAlphabetPass(configs, step.pass);
  if (pass < getAlphabetPassCount(configs) - 1) {
    return { pass: pass + 1, prefix: step.prefix };
  }
  const sibling = shiftLastLetter(step.prefix, 1);
  return sibling === null ? null : { pass: 0, prefix: sibling };
}

export function getPreviousAlphabetStep(
  configs: BinConfig[],
  step: AlphabetStep,
): AlphabetStep | null {
  const pass = clampAlphabetPass(configs, step.pass);
  if (pass > 0) return { pass: pass - 1, prefix: step.prefix };
  const sibling = shiftLastLetter(step.prefix, -1);
  if (sibling === null) return null;
  return {
    pass: Math.max(getAlphabetPassCount(configs) - 1, 0),
    prefix: sibling,
  };
}

export function getAlphabetPassLetters(
  configs: BinConfig[],
  pass: number,
  prefix = "",
): Map<number, string> {
  const bins = getAlphabetBins(configs);
  const start = clampAlphabetPass(configs, pass) * bins.length;
  const normalizedPrefix = normalizeAlphabetPrefix(prefix);
  const letters = new Map<number, string>();
  bins.forEach((bin, i) => {
    const letter = ALPHABET_LETTERS[start + i];
    if (letter) letters.set(bin.binNumber, normalizedPrefix + letter);
  });
  return letters;
}

function toAlphabetSortKey(text: string): string {
  return text
    .replace(/æ/gi, "AE")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function getCardSortKey(card: SourceCard): string | null {
  const name = (card as { name?: unknown }).name;
  if (typeof name !== "string") return null;
  const key = toAlphabetSortKey(name);
  return key.length > 0 ? key : null;
}

export function evaluateAlphabetBin(
  card: SourceCard,
  configs: BinConfig[],
  pass: number,
  prefix = "",
): BinConfig | undefined {
  const catchAll = getCatchAllBin(configs);
  const key = getCardSortKey(card);
  const normalizedPrefix = normalizeAlphabetPrefix(prefix);
  if (!key || !key.startsWith(normalizedPrefix)) return catchAll;
  if (key.length === normalizedPrefix.length) return catchAll;

  const target = normalizedPrefix + key.charAt(normalizedPrefix.length);
  for (const [binNumber, label] of getAlphabetPassLetters(
    configs,
    pass,
    normalizedPrefix,
  )) {
    if (label === target) {
      return configs.find((c) => c.binNumber === binNumber);
    }
  }
  return catchAll;
}
