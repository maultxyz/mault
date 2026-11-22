import {
  BOOLEAN_FIELD_OPTIONS,
  DEFAULT_OPERATORS_BY_FIELD_TYPE,
  RULE_BOOLEAN_FALSE_VALUE,
  RULE_BOOLEAN_TRUE_VALUE,
} from "./constants/games.constant";
import { RULE_DATE_PATTERN, RULE_FALSE_TEXT_VALUES, RULE_TRUE_TEXT_VALUES } from "./constants/sort-bins.constant";
import type { FieldMeta, FieldOption, FieldType } from "./interfaces/sort-bins.interface";

export function buildFieldDefinition(definition: {
  field: string;
  label: string;
  type: FieldType;
  path: string;
  options?: FieldOption[];
}): FieldMeta {
  const options =
    definition.type === "boolean"
      ? BOOLEAN_FIELD_OPTIONS
      : definition.type === "date"
        ? undefined
        : definition.options;
  return {
    field: definition.field,
    label: definition.label,
    type: definition.type,
    path: definition.path,
    operators: DEFAULT_OPERATORS_BY_FIELD_TYPE[definition.type],
    ...(options?.length ? { options } : {}),
  };
}

export function ruleBooleanValue(value: unknown): typeof RULE_BOOLEAN_TRUE_VALUE | typeof RULE_BOOLEAN_FALSE_VALUE | null {
  if (typeof value === "boolean") return value ? RULE_BOOLEAN_TRUE_VALUE : RULE_BOOLEAN_FALSE_VALUE;
  if (typeof value === "number") return value === 0 ? RULE_BOOLEAN_FALSE_VALUE : RULE_BOOLEAN_TRUE_VALUE;
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (RULE_TRUE_TEXT_VALUES.includes(text)) return RULE_BOOLEAN_TRUE_VALUE;
  if (RULE_FALSE_TEXT_VALUES.includes(text)) return RULE_BOOLEAN_FALSE_VALUE;
  return null;
}

export function ruleDateValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = RULE_DATE_PATTERN.exec(value.trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}
