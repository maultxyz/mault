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
  DEFAULT_BIN_HEIGHT,
  DEFAULT_CARD_THICKNESS_MM,
  UNLIMITED_BIN_HEIGHT,
} from "./constants/sort-bins.constant";
import { SCAN_RULE_MATCH_PERCENT_FIELD } from "./constants/scan-rule-fields.constant";
import { cardMatchPercent } from "./scan-rule-fields";

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

function normalizeText(value: unknown): string {
  return String(value).trim().toLowerCase();
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalizeText) : [];
}

function sameSet(a: string[], b: string[]): boolean {
  return (
    a.length === b.length &&
    a.every((v) => b.includes(v)) &&
    b.every((v) => a.includes(v))
  );
}

function evaluateCondition(
  card: SourceCard,
  condition: BinCondition,
  fieldDefinitions: FieldMeta[],
): boolean {
  const cardValue = getCardValue(card, condition.field, fieldDefinitions);
  const { operator, value } = condition;
  const cardText = normalizeText(cardValue);
  const valueText = normalizeText(value);
  const cardList = normalizeList(cardValue);
  const valueList = normalizeList(value);
  const bothLists = Array.isArray(cardValue) && Array.isArray(value);

  switch (operator) {
    case "equals":
      return bothLists ? sameSet(cardList, valueList) : cardText === valueText;

    case "not_equals":
      return bothLists ? !sameSet(cardList, valueList) : cardText !== valueText;

    case "contains":
      return cardText.includes(valueText);

    case "not_contains":
      return !cardText.includes(valueText);

    case "starts_with":
      return cardText.startsWith(valueText);

    case "ends_with":
      return cardText.endsWith(valueText);

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
      return Array.isArray(value) && valueList.includes(cardText);

    case "not_in":
      return Array.isArray(value) && !valueList.includes(cardText);

    case "contains_any":
      return bothLists && valueList.some((v) => cardList.includes(v));

    case "contains_all":
      return bothLists && valueList.every((v) => cardList.includes(v));

    case "contains_none":
      return bothLists && !valueList.some((v) => cardList.includes(v));

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

function hasReachedMaxCopies(
  bin: BinConfig,
  copiesInBin: ((bin: BinConfig) => number) | undefined,
): boolean {
  return (
    bin.maxCopies != null && !!copiesInBin && copiesInBin(bin) >= bin.maxCopies
  );
}

export function hasMaxCopiesBins(configs: BinConfig[]): boolean {
  return configs.some((c) => !c.isCatchAll && c.maxCopies != null);
}

export function getCatchAllBin(configs: BinConfig[]): BinConfig | undefined {
  return configs.find((c) => c.isCatchAll);
}

export function getCatchAllMatchThreshold(rules: BinRuleGroup): number | null {
  if (rules.conditions.length !== 1) return null;
  const [condition] = rules.conditions;
  if (
    isRuleGroup(condition) ||
    condition.field !== SCAN_RULE_MATCH_PERCENT_FIELD ||
    condition.operator !== "lt"
  ) {
    return null;
  }
  const threshold = Number(condition.value);
  return Number.isFinite(threshold) ? threshold : null;
}

export function findLowMatchCatchAll(
  card: SourceCard,
  configs: BinConfig[],
): BinConfig | undefined {
  const catchAll = getCatchAllBin(configs);
  if (!catchAll) return undefined;
  const threshold = getCatchAllMatchThreshold(catchAll.rules);
  if (threshold == null) return undefined;
  const percent = cardMatchPercent(card);
  return percent != null && percent < threshold ? catchAll : undefined;
}

export function evaluateCardBin(
  card: SourceCard,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  copiesInBin?: (bin: BinConfig) => number,
): BinConfig | undefined {
  let catchAll: BinConfig | undefined;
  let firstMatch: BinConfig | undefined;

  for (const config of configs) {
    if (config.isCatchAll) {
      catchAll = config;
      continue;
    }
    if (
      !config.isDisabled &&
      config.rules.conditions.length > 0 &&
      evaluateRuleGroup(card, config.rules, fieldDefinitions) &&
      !hasReachedMaxCopies(config, copiesInBin)
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
): number | null {
  if (height === UNLIMITED_BIN_HEIGHT) return null;
  const binHeight = height && height > 0 ? height : DEFAULT_BIN_HEIGHT;
  const thickness =
    cardThickness && cardThickness > 0
      ? cardThickness
      : DEFAULT_CARD_THICKNESS_MM;
  return Math.floor(binHeight / thickness);
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

export function countCopiesInBin(
  cards: { binNumber?: number | null; scannedAt: number; card: SourceCard }[],
  bin: Pick<BinConfig, "binNumber" | "lastEmptiedAt">,
  cardId: string,
): number {
  return getCardsInBin(cards, bin).filter(
    (c) => (c as { id?: unknown }).id === cardId,
  ).length;
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
    if (bin.isCatchAll || bin.isDisabled) continue;

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
    .filter((c) => !c.isCatchAll && !c.isDisabled)
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
