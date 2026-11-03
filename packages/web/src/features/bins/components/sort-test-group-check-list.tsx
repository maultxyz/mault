import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { formatRuleCondition } from "@/features/bins/lib/rule-format";
import type { SortTestGroupCheckListProps } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

function formatCardValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  return String(value);
}

export function SortTestGroupCheckList({ check }: SortTestGroupCheckListProps) {
  const { t } = useTranslation("bins");
  const { ruleFieldDefinitions } = useBinConfigs();

  return (
    <div className="flex flex-col gap-1">
      {check.items.length > 1 && (
        <span className="text-2xs uppercase tracking-wide text-foreground/70">
          {check.group.combinator === "and"
            ? t("sortTest.allMustMatch")
            : t("sortTest.anyMustMatch")}
        </span>
      )}
      {check.items.map((item, index) =>
        "condition" in item ? (
          <div key={item.condition.id ?? index} className="flex items-start gap-1.5">
            {item.passed ? (
              <IconCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
            ) : (
              <IconX className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            )}
            <div className="flex min-w-0 flex-col">
              <span className="text-xs">
                {formatRuleCondition(item.condition, ruleFieldDefinitions)}
              </span>
              <span className="text-2xs text-foreground/70">
                {t("sortTest.cardValue", {
                  value:
                    formatCardValue(item.cardValue) ?? t("sortTest.noValue"),
                })}
              </span>
            </div>
          </div>
        ) : (
          <div
            key={item.group.id ?? index}
            className={cn(
              "ml-1 border-l pl-2",
              item.passed ? "border-success" : "border-border",
            )}
          >
            <SortTestGroupCheckList check={item} />
          </div>
        ),
      )}
    </div>
  );
}
