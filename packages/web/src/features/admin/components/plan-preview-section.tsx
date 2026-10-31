import { SettingsSection } from "@/components/settings-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlanPreview } from "@/hooks/use-plan-preview";
import { PLAN_PREVIEW_OFF_VALUE } from "@/lib/constants/billing";
import { PLAN_KEYS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PlanPreviewSection() {
  const { t } = useTranslation("admin");
  const { previewPlan, changePreviewPlan } = usePlanPreview();
  const selectedValue = previewPlan ?? PLAN_PREVIEW_OFF_VALUE;
  const labelFor = (value: string) =>
    value === PLAN_PREVIEW_OFF_VALUE
      ? t("plans.preview.off")
      : t(`plans.planNames.${value}`);

  return (
    <SettingsSection
      heading={t("plans.preview.heading")}
      description={t("plans.preview.description")}
      action={
        <Select
          value={selectedValue}
          onValueChange={(value) =>
            changePreviewPlan(
              PLAN_KEYS.find((plan) => plan === value) ?? null,
            )
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue>{labelFor(selectedValue)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[PLAN_PREVIEW_OFF_VALUE, ...PLAN_KEYS].map((value) => (
              <SelectItem key={value} value={value}>
                {labelFor(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );
}
