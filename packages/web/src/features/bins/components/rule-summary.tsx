import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import {
  BinCondition,
  BinRuleGroup,
  FieldMeta,
  isRuleGroup,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

function formatCondition(
  condition: BinCondition,
  fieldDefinitions: FieldMeta[],
): string {
  const fieldMeta = fieldDefinitions.find((f) => f.field === condition.field);
  const fieldLabel = fieldMeta?.label ?? condition.field;
  const opMeta = fieldMeta?.operators.find(
    (o) => o.value === condition.operator,
  );
  const opLabel = opMeta?.label ?? condition.operator;

  if (condition.operator === "is_null" || condition.operator === "is_not_null") {
    return `${fieldLabel} ${opLabel}`;
  }

  let valueStr: string;
  if (Array.isArray(condition.value)) {
    const labels = condition.value.map((v) => {
      const opt = fieldMeta?.options?.find((o) => o.value === v);
      return opt?.label ?? v;
    });
    valueStr = `[${labels.join(", ")}]`;
  } else if (condition.field === "price_usd") {
    valueStr = `$${condition.value}`;
  } else {
    const opt = fieldMeta?.options?.find(
      (o) => o.value === String(condition.value),
    );
    valueStr = opt?.label ?? String(condition.value);
  }

  return `${fieldLabel} ${opLabel} ${valueStr}`;
}

function formatGroup(
  group: BinRuleGroup,
  fieldDefinitions: FieldMeta[],
  t: TFunction<"bins">,
): string {
  if (group.conditions.length === 0) return t("ruleSummary.noConditions");

  const parts = group.conditions.map((item) => {
    if (isRuleGroup(item)) {
      return `(${formatGroup(item, fieldDefinitions, t)})`;
    }
    return formatCondition(item, fieldDefinitions);
  });

  const joiner =
    group.combinator === "and"
      ? ` ${t("ruleSummary.and")} `
      : ` ${t("ruleSummary.or")} `;
  return parts.join(joiner);
}

export function RuleSummary({ rules }: { rules: BinRuleGroup }) {
  const { t } = useTranslation("bins");
  const { fieldDefinitions } = useBinConfigs();
  const text = formatGroup(rules, fieldDefinitions, t);

  return (
    <p className="text-xs line-clamp-3 wrap-break-words text-muted-foreground truncate">
      {text}
    </p>
  );
}
