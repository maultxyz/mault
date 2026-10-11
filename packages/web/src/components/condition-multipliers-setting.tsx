import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ConditionMultipliersSettingProps } from "@/lib/interfaces/settings";
import {
  CARD_CONDITIONS,
  CONDITION_MULTIPLIER_MAX,
  CONDITION_MULTIPLIER_MIN,
  DEFAULT_CARD_CONDITION,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function ConditionMultipliersSetting({
  value,
  disabled,
  errors,
  onChange,
}: ConditionMultipliersSettingProps) {
  const { t } = useTranslation("settings");
  const { t: tCards } = useTranslation("cards");

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border divide-y">
        {CARD_CONDITIONS.map((condition) => {
          const isBase = condition === DEFAULT_CARD_CONDITION;
          const current = value[condition];
          return (
            <label
              key={condition}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="text-sm">
                {tCards(`condition.names.${condition}`)}
              </span>
              <span className="flex items-center gap-2">
                <Input
                  type="number"
                  min={CONDITION_MULTIPLIER_MIN}
                  max={CONDITION_MULTIPLIER_MAX}
                  step={1}
                  className="w-20"
                  disabled={disabled || isBase}
                  aria-label={tCards(`condition.names.${condition}`)}
                  value={Number.isNaN(current) ? "" : current}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [condition]:
                        e.target.value === ""
                          ? Number.NaN
                          : Number(e.target.value),
                    })
                  }
                />
                <span className="text-xs text-foreground/70">%</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-2xs text-foreground/70">
        {t("conditionPricing.baseNote")}
      </p>
      <FieldError errors={errors} />
    </div>
  );
}
