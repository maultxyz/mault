import {
  DEFAULT_SCAN_RULE_FIELD_LABELS,
  SCAN_RULE_FOIL_FIELD,
  SCAN_RULE_FOIL_OPERATORS,
  SCAN_RULE_FOIL_TYPE_FIELD,
  SCAN_RULE_FOIL_TYPE_OPERATORS,
  SCAN_RULE_FOIL_VALUE,
  SCAN_RULE_NON_FOIL_VALUE,
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

const SCAN_RULE_FIELDS: ConditionField[] = [
  SCAN_RULE_FOIL_FIELD,
  SCAN_RULE_FOIL_TYPE_FIELD,
];

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

export function toRuleCard<T extends object>(
  card: T,
  scan: ScanRuleState,
): T {
  return {
    ...card,
    [SCAN_RULE_ROOT]: {
      foil: scan.isFoil ? SCAN_RULE_FOIL_VALUE : SCAN_RULE_NON_FOIL_VALUE,
      foilType: scan.isFoil ? (scan.foilType ?? "") : "",
    },
  };
}
