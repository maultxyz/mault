import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import type { BinCardProps } from "@/lib/interfaces/bins";
import { BinConfig, isRuleGroup } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function countConditions(config: BinConfig): number {
  function count(items: BinConfig["rules"]["conditions"]): number {
    return items.reduce((acc, item) => {
      if (isRuleGroup(item)) {
        return acc + count(item.conditions);
      }
      return acc + 1;
    }, 0);
  }
  return count(config.rules.conditions);
}

export function BinCard({
  config,
  active,
  isAutoAssign,
  isScanOnly,
  onClick,
}: BinCardProps) {
  const { t } = useTranslation("bins");
  const isEmpty = config.rules.conditions.length === 0;
  const conditionCount = countConditions(config);

  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className="h-auto p-2 flex flex-col justify-start text-start w-full"
      onClick={onClick}
    >
      <div className="flex flex-row justify-between gap-2 items-center w-full">
        <p className="font-medium text-sm font-heading">
          {t("binCard.binLabel", { number: config.binNumber })}
        </p>
        {config.isCatchAll ? (
          <Badge variant="default">{t("binCard.catchAll")}</Badge>
        ) : (
          !isEmpty && (
            <Badge variant="secondary">
              {t("binCard.ruleCount", { count: conditionCount })}
            </Badge>
          )
        )}
      </div>
      <div className="w-full text-xs">
        {config.isCatchAll ? (
          <p className="text-xs text-muted-foreground">
            {t("binCard.allUnmatched")}
          </p>
        ) : isEmpty ? (
          <p className="text-xs">
            {isScanOnly
              ? t("binCard.scanOnlyDisabled")
              : isAutoAssign
                ? t("binCard.waitingForValue")
                : t("binCard.clickToConfigure")}
          </p>
        ) : (
          <RuleSummary rules={config.rules} />
        )}
      </div>
    </Button>
  );
}
