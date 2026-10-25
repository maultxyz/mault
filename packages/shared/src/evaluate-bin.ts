import type { SourceCard } from "./interfaces/card.interface";
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
  CUSTOM_BIN_HEIGHT_MAX_MM,
  CUSTOM_BIN_HEIGHT_MIN_MM,
  DEFAULT_BIN_HEIGHT,
  DEFAULT_CARD_THICKNESS_MM,
  REPACK_UNIQUE_BY_NAME,
  REPACK_UNIQUE_BY_PRINTING,
  UNLIMITED_BIN_HEIGHT,
} from "./constants/sort-bins.constant";
import { SCAN_RULE_MATCH_PERCENT_FIELD } from "./constants/scan-rule-fields.constant";
import { cardMatchPercent } from "./scan-rule-fields";

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

function getFrontFace(root: SourceCard): SourceCard | undefined {
  const faces = (root as { card_faces?: unknown }).card_faces;
  const front = Array.isArray(faces) ? faces[0] : undefined;
  return front && typeof front === "object" ? (front as SourceCard) : undefined;
}

function getRawValue(rawRoot: SourceCard, path: string): unknown {
  const value = getByPath(rawRoot, path);
  if (value !== undefined) return value;
  const front = getFrontFace(rawRoot);
  return front ? getByPath(front, path) : undefined;
}

export function getCardValue(
  card: SourceCard,
  field: BinCondition["field"],
  fieldDefinitions: FieldMeta[],
): string | number | string[] | null {
  const meta = fieldDefinitions.find((f) => f.field === field);
  if (!meta) return "";

  const rawRoot = getRawRoot(card);
  const rawValue = rawRoot ? getRawValue(rawRoot, meta.path) : undefined;
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

function itemCount(value: string | number | string[] | null): number {
  if (Array.isArray(value)) return value.length;
  return isNullish(value) ? 0 : 1;
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

    case "count_equals":
      return itemCount(cardValue) === Number(value);

    case "count_gt":
      return itemCount(cardValue) > Number(value);

    case "count_lt":
      return itemCount(cardValue) < Number(value);

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

export function getOverflowSources(
  configs: BinConfig[],
  binNumber: number,
): BinConfig[] {
  const target = configs.find((c) => c.binNumber === binNumber);
  if (target?.isCatchAll) return [];
  return configs.filter(
    (c) => c.overflowBin === binNumber && c.binNumber !== binNumber,
  );
}

export function isOverflowTarget(
  configs: BinConfig[],
  binNumber: number,
): boolean {
  return getOverflowSources(configs, binNumber).length > 0;
}

function getOverflowTarget(
  bin: BinConfig,
  configs: BinConfig[],
): BinConfig | undefined {
  if (bin.overflowBin == null || bin.overflowBin === bin.binNumber) {
    return undefined;
  }
  const target = configs.find((c) => c.binNumber === bin.overflowBin);
  return target && !target.isCatchAll && !target.isDisabled
    ? target
    : undefined;
}

export function isRulesMode(
  set:
    | Pick<
        BinSet,
        "scanOnly" | "isChaosMode" | "isAlphabetMode" | "isRepackMode"
      >
    | undefined,
): boolean {
  return (
    !set?.scanOnly &&
    !set?.isChaosMode &&
    !set?.isAlphabetMode &&
    !set?.isRepackMode
  );
}

export function resolveOverflowBin(
  bin: BinConfig,
  configs: BinConfig[],
  isBlocked: (bin: BinConfig) => boolean,
): BinConfig {
  const visited = new Set([bin.binNumber]);
  let current = bin;
  while (isBlocked(current)) {
    const next = getOverflowTarget(current, configs);
    if (!next || visited.has(next.binNumber)) break;
    visited.add(next.binNumber);
    current = next;
  }
  return current;
}

export function parseLegacyCatchAllThreshold(
  rules: BinRuleGroup,
): number | null {
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
  const threshold = catchAll?.lowMatchPercent;
  if (!catchAll || threshold == null) return undefined;
  const percent = cardMatchPercent(card);
  return percent != null && percent < threshold ? catchAll : undefined;
}

export function isOverrideBin(config: BinConfig): boolean {
  return config.isCatchAll
    ? config.rules.conditions.length > 0
    : !!config.isOverride;
}

function compareOverrides(
  a: BinConfig,
  b: BinConfig,
  cardsInBin?: (bin: BinConfig) => number,
): number {
  const rankA = a.overridePriority ?? Number.POSITIVE_INFINITY;
  const rankB = b.overridePriority ?? Number.POSITIVE_INFINITY;
  if (rankA !== rankB) return rankA - rankB;
  if (a.overridePriority == null || !cardsInBin) return 0;
  return cardsInBin(a) - cardsInBin(b);
}

export function sortOverrideBins(
  configs: BinConfig[],
  cardsInBin?: (bin: BinConfig) => number,
): BinConfig[] {
  return configs
    .filter(isOverrideBin)
    .map((config, index) => ({ config, index }))
    .sort(
      (a, b) =>
        compareOverrides(a.config, b.config, cardsInBin) || a.index - b.index,
    )
    .map(({ config }) => config);
}

export function matchesCatchAllRules(
  card: SourceCard,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
): boolean {
  const catchAll = getCatchAllBin(configs);
  return (
    !!catchAll &&
    catchAll.rules.conditions.length > 0 &&
    evaluateRuleGroup(card, catchAll.rules, fieldDefinitions)
  );
}

export function evaluateCardBin(
  card: SourceCard,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  copiesInBin?: (bin: BinConfig) => number,
  cardsInBin?: (bin: BinConfig) => number,
  isBinFull?: (bin: BinConfig) => boolean,
): BinConfig | undefined {
  let catchAll: BinConfig | undefined;
  let firstMatch: BinConfig | undefined;
  let override: BinConfig | undefined;

  for (const config of configs) {
    if (config.isCatchAll) catchAll = config;
    const isOverride = isOverrideBin(config);
    if (
      (config.isDisabled && !config.isCatchAll) ||
      config.rules.conditions.length === 0 ||
      isOverflowTarget(configs, config.binNumber) ||
      (!isOverride && firstMatch) ||
      (isOverride &&
        override &&
        compareOverrides(config, override, cardsInBin) >= 0)
    ) {
      continue;
    }
    if (
      !evaluateRuleGroup(card, config.rules, fieldDefinitions) ||
      (hasReachedMaxCopies(config, copiesInBin) &&
        !getOverflowTarget(config, configs))
    ) {
      continue;
    }
    if (isOverride) override = config;
    else firstMatch = config;
  }

  const isBlocked = (bin: BinConfig) =>
    hasReachedMaxCopies(bin, copiesInBin) || !!isBinFull?.(bin);
  const matched = override ?? firstMatch;
  if (matched) {
    const target = resolveOverflowBin(matched, configs, isBlocked);
    if (!hasReachedMaxCopies(target, copiesInBin)) return target;
  }
  return catchAll && resolveOverflowBin(catchAll, configs, isBlocked);
}

export function isValidBinHeight(height: unknown): height is number {
  return (
    typeof height === "number" &&
    Number.isFinite(height) &&
    (height === UNLIMITED_BIN_HEIGHT ||
      (height >= CUSTOM_BIN_HEIGHT_MIN_MM &&
        height <= CUSTOM_BIN_HEIGHT_MAX_MM))
  );
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
  bin: Pick<BinConfig, "binNumber" | "lastEmptiedAt" | "maxCopiesBy">,
  card: SourceCard,
  fieldDefinitions: FieldMeta[],
): number {
  const copiesBy = bin.maxCopiesBy ?? REPACK_UNIQUE_BY_PRINTING;
  const key = repackDuplicateKey(card, copiesBy, fieldDefinitions);
  if (key == null) return 0;
  return getCardsInBin(cards, bin).filter(
    (c) => repackDuplicateKey(c, copiesBy, fieldDefinitions) === key,
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

export function getRepackPackSize(slots: RepackSlot[]): number {
  return slots.reduce((sum, slot) => sum + Math.max(slot.targetCount, 0), 0);
}

export function getCurrentRepackPack(
  cardsOldestFirst: SourceCard[],
  slots: RepackSlot[],
  fieldDefinitions: FieldMeta[],
): SourceCard[] {
  let pack: SourceCard[] = [];
  for (const card of cardsOldestFirst) {
    pack.push(card);
    if (isRepackComplete(slots, fieldDefinitions, pack)) pack = [];
  }
  return pack;
}

export function getRepackBinCards(
  cards: { binNumber?: number | null; scannedAt: number; card: SourceCard }[],
  bin: Pick<BinConfig, "binNumber" | "lastEmptiedAt">,
  binSet: Pick<BinSet, "repackSlots"> &
    Partial<Pick<BinSet, "repackMultiplePacks">>,
  fieldDefinitions: FieldMeta[],
): SourceCard[] {
  if (!binSet.repackMultiplePacks) return getCardsInBin(cards, bin);
  const oldestFirst = cards
    .filter(
      (c) =>
        c.binNumber === bin.binNumber &&
        (bin.lastEmptiedAt == null || c.scannedAt > bin.lastEmptiedAt),
    )
    .sort((a, b) => a.scannedAt - b.scannedAt)
    .map((c) => c.card);
  return getCurrentRepackPack(oldestFirst, binSet.repackSlots, fieldDefinitions);
}

function canStartRepackPack(
  bin: BinConfig,
  cardsInPack: SourceCard[],
  binSet: Pick<BinSet, "repackSlots"> &
    Partial<Pick<BinSet, "repackMultiplePacks">>,
  binRoom: (bin: BinConfig) => number,
): boolean {
  return (
    !binSet.repackMultiplePacks ||
    cardsInPack.length > 0 ||
    binRoom(bin) >= getRepackPackSize(binSet.repackSlots)
  );
}

function unlimitedBinRoom(): number {
  return Number.POSITIVE_INFINITY;
}

export function repackDuplicateKey(
  card: SourceCard,
  uniqueBy: string,
  fieldDefinitions: FieldMeta[],
): string | null {
  if (uniqueBy === REPACK_UNIQUE_BY_PRINTING) {
    const id = (card as { id?: unknown }).id;
    return id == null ? null : String(id);
  }
  const value =
    uniqueBy === REPACK_UNIQUE_BY_NAME
      ? (card as { name?: unknown }).name
      : getCardValue(card, uniqueBy, fieldDefinitions);
  if (value == null) return null;
  const key = Array.isArray(value)
    ? normalizeList(value).sort().join("\u0000")
    : normalizeText(value);
  return key.length > 0 ? key : null;
}

function isDuplicateInPack(
  card: SourceCard,
  cardsInPack: SourceCard[],
  uniqueBy: string,
  fieldDefinitions: FieldMeta[],
): boolean {
  const key = repackDuplicateKey(card, uniqueBy, fieldDefinitions);
  return (
    key != null &&
    cardsInPack.some(
      (c) => repackDuplicateKey(c, uniqueBy, fieldDefinitions) === key,
    )
  );
}

export function getRepackSiftBin(configs: BinConfig[]): BinConfig | undefined {
  return configs
    .filter((c) => !c.isCatchAll && !c.isDisabled)
    .sort((a, b) => a.binNumber - b.binNumber)[0];
}

function getActiveRepackSiftBin(
  configs: BinConfig[],
  binSet: Pick<BinSet, "repackSiftRules">,
): BinConfig | undefined {
  const siftRules = binSet.repackSiftRules;
  return siftRules && siftRules.conditions.length > 0
    ? getRepackSiftBin(configs)
    : undefined;
}

export function getRepackPackBins(
  configs: BinConfig[],
  binSet: Pick<BinSet, "repackSiftRules">,
): BinConfig[] {
  const siftBin = getActiveRepackSiftBin(configs, binSet);
  return configs.filter(
    (bin) => !bin.isCatchAll && !bin.isDisabled && bin !== siftBin,
  );
}

export function sortRepackPackBins(bins: BinConfig[]): BinConfig[] {
  const rank = (bin: BinConfig) =>
    bin.repackPriority ?? Number.POSITIVE_INFINITY;
  return [...bins].sort((a, b) => {
    const rankA = rank(a);
    const rankB = rank(b);
    return rankA === rankB ? a.binNumber - b.binNumber : rankA - rankB;
  });
}

export function areAllRepackPacksComplete(
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  binSet: Pick<BinSet, "repackSlots" | "repackSiftRules"> &
    Partial<Pick<BinSet, "repackMultiplePacks">>,
  cardsInBin: (bin: BinConfig) => SourceCard[],
  binRoom: (bin: BinConfig) => number = unlimitedBinRoom,
): boolean {
  const packBins = getRepackPackBins(configs, binSet);
  return (
    packBins.length > 0 &&
    packBins.every((bin) => {
      const cardsInPack = cardsInBin(bin);
      return binSet.repackMultiplePacks
        ? !canStartRepackPack(bin, cardsInPack, binSet, binRoom)
        : isRepackComplete(binSet.repackSlots, fieldDefinitions, cardsInPack);
    })
  );
}

export function evaluateRepackBin(
  card: SourceCard,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  binSet: Pick<
    BinSet,
    "repackSlots" | "repackUniqueBy" | "repackSiftRules"
  > &
    Partial<Pick<BinSet, "repackMultiplePacks">>,
  cardsInBin: (bin: BinConfig) => SourceCard[],
  binRoom: (bin: BinConfig) => number = unlimitedBinRoom,
): BinConfig | undefined {
  const catchAll = getCatchAllBin(configs);
  const siftRules = binSet.repackSiftRules;
  const siftBin = getActiveRepackSiftBin(configs, binSet);

  if (
    siftBin &&
    siftRules &&
    evaluateRuleGroup(card, siftRules, fieldDefinitions)
  ) {
    return siftBin;
  }

  for (const bin of sortRepackPackBins(getRepackPackBins(configs, binSet))) {
    const cardsInPack = cardsInBin(bin);
    if (isRepackComplete(binSet.repackSlots, fieldDefinitions, cardsInPack)) {
      continue;
    }
    if (!canStartRepackPack(bin, cardsInPack, binSet, binRoom)) continue;
    if (
      binSet.repackUniqueBy &&
      isDuplicateInPack(card, cardsInPack, binSet.repackUniqueBy, fieldDefinitions)
    ) {
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

export function getChaosBins(configs: BinConfig[]): BinConfig[] {
  return configs
    .filter((c) => !c.isCatchAll && !c.isDisabled)
    .sort((a, b) => a.binNumber - b.binNumber);
}

export function evaluateChaosBin(
  configs: BinConfig[],
  isBinFull: (bin: BinConfig) => boolean,
): BinConfig | undefined {
  const next = getChaosBins(configs).find((bin) => !isBinFull(bin));
  return next ?? getCatchAllBin(configs);
}

export function evaluateScanOnlyBin(
  configs: BinConfig[],
  scanOnlyBin: number | null,
): BinConfig | undefined {
  const target =
    scanOnlyBin == null
      ? undefined
      : configs.find((c) => c.binNumber === scanOnlyBin && !c.isDisabled);
  return target ?? getCatchAllBin(configs);
}

export function areAllChaosBinsFull(
  configs: BinConfig[],
  isBinFull: (bin: BinConfig) => boolean,
): boolean {
  const bins = getChaosBins(configs);
  return bins.length > 0 && bins.every(isBinFull);
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

export function findAutoAssignTarget(
  card: SourceCard,
  configs: BinConfig[],
  fieldDefinitions: FieldMeta[],
  autoAssignField: string | null,
  newId: () => string,
): { binNumber: number; rules: BinRuleGroup } | null {
  if (!autoAssignField) return null;
  if (findLowMatchCatchAll(card, configs)) return null;
  if (matchesCatchAllRules(card, configs, fieldDefinitions)) return null;

  const matched = evaluateCardBin(card, configs, fieldDefinitions);
  if (matched && !matched.isCatchAll) return null;

  const nextOpen = configs
    .filter(
      (c) =>
        !c.isCatchAll &&
        !c.isDisabled &&
        c.rules.conditions.length === 0 &&
        !isOverflowTarget(configs, c.binNumber),
    )
    .sort((a, b) => a.binNumber - b.binNumber)[0];
  if (!nextOpen) return null;

  const value = getCardValue(card, autoAssignField, fieldDefinitions);
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  return {
    binNumber: nextOpen.binNumber,
    rules: {
      id: newId(),
      combinator: "and",
      conditions: [{ id: newId(), field: autoAssignField, operator: "equals", value }],
    },
  };
}
