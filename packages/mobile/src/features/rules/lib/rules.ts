import * as Crypto from "expo-crypto";
import type { TFunction } from "i18next";
import {
  isRuleGroup,
  type BinCondition,
  type BinConfig,
  type BinRuleGroup,
  type BinSet,
  type FieldMeta,
} from "@magic-vault/shared";
import { MULTI_VALUE_OPERATORS, VALUELESS_OPERATORS } from "@/lib/constants/rules";
import type { BinSetMode, ConditionDescription } from "@/lib/interfaces/rules";

export function sortFields(fields: FieldMeta[]): FieldMeta[] {
  return [...fields].sort((a, b) => a.label.localeCompare(b.label));
}

export function defaultValueFor(meta: FieldMeta | undefined, operator: BinCondition["operator"]): BinCondition["value"] {
  if (!meta) return "";
  if (MULTI_VALUE_OPERATORS.includes(operator)) return [];
  if (meta.type === "set" && (operator === "equals" || operator === "not_equals")) return [];
  return "";
}

export function createCondition(fields: FieldMeta[]): BinCondition {
  const meta = sortFields(fields)[0];
  const operator = meta?.operators[0]?.value ?? "equals";
  return {
    id: Crypto.randomUUID(),
    field: meta?.field ?? "",
    operator,
    value: defaultValueFor(meta, operator),
  };
}

export function createGroup(fields: FieldMeta[]): BinRuleGroup {
  return { id: Crypto.randomUUID(), combinator: "and", conditions: [createCondition(fields)] };
}

export function emptyRules(): BinRuleGroup {
  return { id: Crypto.randomUUID(), combinator: "and", conditions: [] };
}

export function countConditions(group: BinRuleGroup): number {
  return group.conditions.reduce((sum, item) => sum + (isRuleGroup(item) ? countConditions(item) : 1), 0);
}

export function isMultiValue(meta: FieldMeta | undefined, operator: BinCondition["operator"]): boolean {
  return (
    MULTI_VALUE_OPERATORS.includes(operator) ||
    (meta?.type === "set" && (operator === "equals" || operator === "not_equals"))
  );
}

export function needsValue(operator: BinCondition["operator"]): boolean {
  return !VALUELESS_OPERATORS.includes(operator);
}

export function describeCondition(condition: BinCondition, fields: FieldMeta[]): ConditionDescription {
  const meta = fields.find((f) => f.field === condition.field);
  const opLabel = meta?.operators.find((o) => o.value === condition.operator)?.label ?? condition.operator;
  const label = (value: string) => meta?.options?.find((o) => o.value === value)?.label ?? value;
  const valueText = !needsValue(condition.operator)
    ? ""
    : Array.isArray(condition.value)
      ? condition.value.map(label).join(", ")
      : label(String(condition.value));
  return { field: meta?.label ?? condition.field, predicate: [opLabel, valueText].filter(Boolean).join(" ") };
}

export function isConditionComplete(condition: BinCondition): boolean {
  if (!condition.field) return false;
  if (!needsValue(condition.operator)) return true;
  return Array.isArray(condition.value) ? condition.value.length > 0 : String(condition.value).trim() !== "";
}

export function ruleChips(group: BinRuleGroup, fields: FieldMeta[], t: TFunction): string[] {
  return group.conditions.map((item) => {
    if (isRuleGroup(item)) return t("rules.groupChip", { count: countConditions(item) });
    const { field, predicate } = describeCondition(item, fields);
    return `${field} ${predicate}`;
  });
}

export function binSetMode(set: BinSet | undefined): BinSetMode {
  if (!set) return "rules";
  if (set.isRepackMode) return "repack";
  if (set.autoAssignField) return "auto-assign";
  if (set.isAlphabetMode) return "alphabet";
  if (set.isChaosMode) return "chaos";
  if (set.scanOnly) return "scan-only";
  return "rules";
}

export function overflowSourcesFor(binNumber: number, bins: BinConfig[]): number[] {
  return bins.filter((b) => b.overflowBin === binNumber && b.binNumber !== binNumber).map((b) => b.binNumber);
}

export function overflowTargetsFor(binNumber: number, bins: BinConfig[]): number[] {
  return bins
    .filter(
      (b) =>
        b.binNumber !== binNumber &&
        !b.isCatchAll &&
        !b.pickList &&
        countConditions(b.rules) === 0 &&
        b.overflowBin == null,
    )
    .map((b) => b.binNumber);
}
