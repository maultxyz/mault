import {
  DEFAULT_SCAN_RULE_FIELD_LABELS,
  SCAN_RULE_FOIL_FIELD,
  SCAN_RULE_FOIL_OPERATORS,
  SCAN_RULE_FOIL_TYPE_FIELD,
  SCAN_RULE_FOIL_TYPE_OPERATORS,
  SCAN_RULE_FOIL_VALUE,
  SCAN_RULE_MARKET_VALUE_EUR_FIELD,
  SCAN_RULE_MARKET_VALUE_USD_FIELD,
  SCAN_RULE_MATCH_PERCENT_FIELD,
  SCAN_RULE_NUMERIC_OPERATORS,
  SCAN_RULE_NON_FOIL_VALUE,
  SCAN_RULE_FIELDS,
  SCAN_RULE_ROOT,
} from "./constants/scan-rule-fields.constant";
import type {
  ScanRuleFieldLabels,
  ScanRuleState,
} from "./interfaces/scan-rule-fields.interface";
import type {
  ConditionField,
  FieldMeta,
} from "./interfaces/sort-bins.interface";
import type { PlayingCard } from "./interfaces/card.interface";
import { cardPriceFor } from "./price-source";

export function cardMatchPercent(card: object): number | null {
  const { distance, confidence } = card as {
    distance?: unknown;
    confidence?: unknown;
  };
  if (typeof distance !== "number") return null;
  const score = typeof confidence === "number" ? confidence : 1 - distance;
  return Math.max(0, Math.min(100, score * 100));
}

export function isScanRuleField(
  field: ConditionField,
  fieldDefinitions: FieldMeta[],
): boolean {
  const meta = fieldDefinitions.find((f) => f.field === field);
  return (
    SCAN_RULE_FIELDS.includes(field) &&
    !!meta?.path.startsWith(`${SCAN_RULE_ROOT}.`)
  );
}

export function scanRuleFieldDefinitions(
  foilTypes: string[],
  labels: ScanRuleFieldLabels = DEFAULT_SCAN_RULE_FIELD_LABELS,
): FieldMeta[] {
  const fields: FieldMeta[] = [
    {
      field: SCAN_RULE_FOIL_FIELD,
      label: labels.foil,
      type: "enum",
      path: `${SCAN_RULE_ROOT}.foil`,
      operators: SCAN_RULE_FOIL_OPERATORS,
      options: [
        { value: SCAN_RULE_FOIL_VALUE, label: labels.foilOption },
        { value: SCAN_RULE_NON_FOIL_VALUE, label: labels.nonFoilOption },
      ],
    },
    {
      field: SCAN_RULE_MATCH_PERCENT_FIELD,
      label: labels.matchPercent,
      type: "numeric",
      path: `${SCAN_RULE_ROOT}.matchPercent`,
      operators: SCAN_RULE_NUMERIC_OPERATORS,
    },
    {
      field: SCAN_RULE_MARKET_VALUE_USD_FIELD,
      label: labels.marketValueUsd,
      type: "numeric",
      path: `${SCAN_RULE_ROOT}.marketValueUsd`,
      operators: SCAN_RULE_NUMERIC_OPERATORS,
    },
    {
      field: SCAN_RULE_MARKET_VALUE_EUR_FIELD,
      label: labels.marketValueEur,
      type: "numeric",
      path: `${SCAN_RULE_ROOT}.marketValueEur`,
      operators: SCAN_RULE_NUMERIC_OPERATORS,
    },
  ];
  if (foilTypes.length > 0) {
    fields.push({
      field: SCAN_RULE_FOIL_TYPE_FIELD,
      label: labels.foilType,
      type: "enum",
      path: `${SCAN_RULE_ROOT}.foilType`,
      operators: SCAN_RULE_FOIL_TYPE_OPERATORS,
      options: foilTypes.map((type) => ({ value: type, label: type })),
    });
  }
  return fields;
}

export function withScanRuleFields(
  fieldDefinitions: FieldMeta[],
  foilTypes: string[],
  labels?: ScanRuleFieldLabels,
): FieldMeta[] {
  const taken = new Set(fieldDefinitions.map((f) => f.field));
  return [
    ...fieldDefinitions,
    ...scanRuleFieldDefinitions(foilTypes, labels).filter(
      (f) => !taken.has(f.field),
    ),
  ];
}

export function toRuleCard<T extends object>(card: T, scan: ScanRuleState): T {
  return {
    ...card,
    [SCAN_RULE_ROOT]: {
      foil: scan.isFoil ? SCAN_RULE_FOIL_VALUE : SCAN_RULE_NON_FOIL_VALUE,
      foilType: scan.isFoil ? (scan.foilType ?? "") : "",
      matchPercent: cardMatchPercent(card),
      marketValueUsd: cardPriceFor(
        card as PlayingCard,
        scan.isFoil,
        "tcgplayer",
      ),
      marketValueEur: cardPriceFor(
        card as PlayingCard,
        scan.isFoil,
        "cardmarket",
      ),
    },
  };
}
