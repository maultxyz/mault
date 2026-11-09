import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PillButton } from "@/components/ui/pill-button";
import { usePlanPreviewForSignedInAdmin } from "@/lib/auth/plan-preview";

export function PlanPreviewTopBarChip() {
  const { t } = useTranslation();
  const previewPlan = usePlanPreviewForSignedInAdmin();
  if (!previewPlan) return null;
  return (
    <PillButton
      tone="warning"
      icon="plans"
      label={t("admin.planPreviewChip", { plan: t(`settings.billing.plan.${previewPlan}`) })}
      onPress={() => router.push("/admin/plans")}
    />
  );
}
