import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import type { BinCardProps } from "@/lib/interfaces/bins";
import {
  BinConfig,
  getPickListTotals,
  isPickListBin as isPickListConfig,
  isRuleGroup,
} from "@magic-vault/shared";
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
  showPickList,
  active,
  isAutoAssign,
  isScanOnly,
  isScanOnlyTarget,
  isChaosMode,
  alphabetLetter,
  repackPriority,
  showOverflow,
  overflowSources = [],
  disabled,
  onClick,
}: BinCardProps) {
  const { t } = useTranslation("bins");
  const isEmpty = config.rules.conditions.length === 0;
  const lowMatchPercent = config.isCatchAll
    ? (config.lowMatchPercent ?? null)
    : null;
  const conditionCount = countConditions(config);
  const isDisabled = !config.isCatchAll && !!config.isDisabled;
  const isOverflow = !config.isCatchAll && overflowSources.length > 0;
  const pickList = config.pickList ?? null;
  const isPickListBin = !!showPickList && isPickListConfig(config);
  const pickListTotals =
    isPickListBin && pickList ? getPickListTotals(pickList) : null;
  const overflowTo =
    showOverflow && !isDisabled ? (config.overflowBin ?? null) : null;

  return (
    <Button
      variant={active ? "selected" : "ghost"}
      className="h-auto p-2 flex flex-col justify-start text-start w-full whitespace-normal max-md:h-auto max-md:gap-1 max-md:p-3 max-md:[&_p]:text-sm"
      disabled={disabled}
      onClick={onClick}
    >
      <div className="flex flex-row justify-between gap-2 items-center w-full">
        <p className="font-medium text-sm font-heading max-md:text-base!">
          {t("binLabel", { number: config.binNumber })}
        </p>
        <div className="flex items-center gap-1">
          {isPickListBin ? (
            <>
              {isDisabled && (
                <Badge variant="outline">{t("binCard.disabled")}</Badge>
              )}
              <Badge variant="default">{t("binCard.pickList")}</Badge>
            </>
          ) : (
            <>
              {isDisabled && (
                <Badge variant="outline">{t("binCard.disabled")}</Badge>
              )}
              {!isDisabled &&
                !isChaosMode &&
                !config.isCatchAll &&
                alphabetLetter === undefined &&
                config.maxCopies != null && (
                  <Badge variant="outline">
                    {t("binCard.maxCopies", { count: config.maxCopies })}
                  </Badge>
                )}
              {!isDisabled && repackPriority != null && (
                <Badge variant="outline">
                  {t("binCard.priority", { priority: repackPriority })}
                </Badge>
              )}
              {(config.isCatchAll || config.isOverride) &&
                !isDisabled &&
                !isChaosMode &&
                alphabetLetter === undefined &&
                !isEmpty &&
                config.overridePriority != null && (
                  <Badge variant="outline">
                    {t("binCard.priority", { priority: config.overridePriority })}
                  </Badge>
                )}
              {config.isCatchAll ? (
                <Badge variant="default">{t("catchAll")}</Badge>
              ) : isDisabled || isChaosMode ? null : isOverflow ? (
                <Badge variant="outline">{t("binCard.overflow")}</Badge>
              ) : alphabetLetter !== undefined ? (
                alphabetLetter && (
                  <Badge variant="secondary">{alphabetLetter}</Badge>
                )
              ) : config.isOverride ? (
                <Badge variant="outline">{t("binCard.override")}</Badge>
              ) : (
                !isEmpty && (
                  <Badge variant="secondary">
                    {t("binCard.ruleCount", { count: conditionCount })}
                  </Badge>
                )
              )}
            </>
          )}
        </div>
      </div>
      <div className="w-full min-w-0 text-xs">
        {isPickListBin ? (
          <p className="text-xs">
            {pickList?.mode !== "all"
              ? t("binCard.pickListProgress", {
                  found: pickListTotals?.found ?? 0,
                  total: pickListTotals?.wanted ?? 0,
                })
              : t("binCard.pickListAll", { count: pickListTotals?.found ?? 0 })}
          </p>
        ) : isScanOnly && (config.isCatchAll || isScanOnlyTarget) ? (
          <p className="text-xs">
            {config.isCatchAll
              ? isScanOnlyTarget
                ? t("binCard.scanOnlyEverything")
                : t("binCard.scanOnlyUnidentified")
              : t("binCard.scanOnlyScanned")}
          </p>
        ) : config.isCatchAll ? (
          <>
            <p className="text-xs text-foreground/70">
              {t("binCard.allUnmatched")}
            </p>
            {lowMatchPercent != null && (
              <p className="text-xs">
                {t("binCard.lowMatch", { percent: lowMatchPercent })}
              </p>
            )}
            {!isEmpty && !isChaosMode && alphabetLetter === undefined && (
              <>
                <p className="text-xs">{t("binCard.catchAllOverride")}</p>
                <RuleSummary rules={config.rules} />
              </>
            )}
          </>
        ) : isDisabled ? (
          <p className="text-xs text-foreground/70">
            {t("binCard.disabledDescription")}
          </p>
        ) : isOverflow ? (
          <p className="text-xs">
            {t("binCard.overflowFor", {
              bins: overflowSources.join(", "),
              count: overflowSources.length,
            })}
          </p>
        ) : isChaosMode ? (
          <p className="text-xs">{t("binCard.chaosFill")}</p>
        ) : alphabetLetter !== undefined ? (
          <p className="text-xs">
            {alphabetLetter
              ? t("binCard.alphabetLetter", { letter: alphabetLetter })
              : t("alphabetPanel.unusedBin")}
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
        {overflowTo != null && (
          <p className="text-xs text-foreground/70">
            {t("binCard.overflowsTo", { number: overflowTo })}
          </p>
        )}
      </div>
    </Button>
  );
}
