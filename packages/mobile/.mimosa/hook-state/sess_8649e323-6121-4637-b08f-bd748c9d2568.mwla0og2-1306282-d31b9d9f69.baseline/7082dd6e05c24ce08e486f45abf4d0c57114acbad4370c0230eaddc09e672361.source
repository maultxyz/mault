import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PLAN_FEATURE_KEYS } from "@magic-vault/shared";
import { SwitchRow } from "@/components/ui/switch-row";
import type { PlansFeatureRowsProps } from "@/lib/interfaces/admin-plans";

export function PlansFeatureRows({ plan, control, disabled }: PlansFeatureRowsProps) {
  const { t } = useTranslation();
  return PLAN_FEATURE_KEYS.map((feature) => (
    <Controller
      key={feature}
      control={control}
      name={`${plan}.features.${feature}`}
      render={({ field }) => (
        <SwitchRow
          title={t(`admin.plans.features.${feature}.label`)}
          description={t(`admin.plans.features.${feature}.description`)}
          value={field.value === true}
          onValueChange={field.onChange}
          disabled={disabled}
        />
      )}
    />
  ));
}
