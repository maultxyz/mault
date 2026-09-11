import type { ScannedCard } from "./interfaces/scanner.interface";
import type {
  BinCondition,
  BinConfig,
  BinRuleGroup,
  FieldMeta,
} from "./interfaces/sort-bins.interface";
import { isRuleGroup } from "./interfaces/sort-bins.interface";

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

function evaluateRuleGroup(
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

  for (const config of configs) {
    if (config.isCatchAll) {
      catchAll = config;
      continue;
    }
    if (
      config.rules.conditions.length > 0 &&
      evaluateRuleGroup(card, config.rules, fieldDefinitions)
    ) {
      return config;
    }
  }

  return catchAll;
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
