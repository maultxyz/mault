import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { isRuleGroup } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function AutoAssignSnapshot() {
  const { t } = useTranslation("bins");
  const { configs, fieldDefinitions, selectedSet } = useBinConfigs();
  const autoAssignField = selectedSet?.autoAssignField ?? null;

  if (!autoAssignField) return null;

  const fieldMeta = fieldDefinitions.find((f) => f.field === autoAssignField);

  const rows = configs
    .filter((c) => !c.isCatchAll)
    .sort((a, b) => a.binNumber - b.binNumber)
    .map((c) => {
      const condition = c.rules.conditions.find(
        (item) => !isRuleGroup(item) && item.field === autoAssignField,
      );
      const value =
        condition && !isRuleGroup(condition) ? condition.value : null;
      const label =
        value == null
          ? null
          : (fieldMeta?.options?.find((o) => o.value === String(value))
              ?.label ?? String(value));
      return { binNumber: c.binNumber, label };
    });

  return (
    <div className="rounded-lg border p-2 my-2 flex flex-col gap-1 text-xs max-h-40 overflow-y-auto">
      {rows.map((row) => (
        <div key={row.binNumber} className="flex gap-2">
          <span className="w-16 shrink-0 text-muted-foreground">
            {t("presetSelector.binLabel", { number: row.binNumber })}
          </span>
          <span
            className={
              row.label ? "font-medium" : "text-muted-foreground italic"
            }
          >
            {row.label ?? t("autoAssignPanel.notYetAssigned")}
          </span>
        </div>
      ))}
    </div>
  );
}
