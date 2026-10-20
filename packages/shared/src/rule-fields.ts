import {
  isRuleGroup,
  type BinCondition,
  type BinRuleGroup,
  type ConditionField,
  type FieldRenames,
} from "./interfaces/sort-bins.interface";

export function renamedField(
  field: ConditionField,
  renames: FieldRenames,
): ConditionField {
  return Object.prototype.hasOwnProperty.call(renames, field)
    ? renames[field]
    : field;
}

function renameCondition(
  condition: BinCondition,
  renames: FieldRenames,
): BinCondition {
  const field = renamedField(condition.field, renames);
  return field === condition.field ? condition : { ...condition, field };
}

export function renameRuleFields(
  group: BinRuleGroup,
  renames: FieldRenames,
): BinRuleGroup {
  return {
    ...group,
    conditions: group.conditions.map((item) =>
      isRuleGroup(item)
        ? renameRuleFields(item, renames)
        : renameCondition(item, renames),
    ),
  };
}
