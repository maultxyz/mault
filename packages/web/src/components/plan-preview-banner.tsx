import { Button } from "@/components/ui/button";
import { useBilling } from "@/features/billing/api/use-billing";
import { billingPlanNameKey } from "@/features/billing/lib/billing-plan-name";
import { usePlanPreview } from "@/hooks/use-plan-preview";
import { ALERT_SEVERITY_BANNER_CLASS } from "@/lib/constants/colors";
import { cn } from "@/lib/utils";
import { IconEye } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PlanPreviewBanner() {
  const { t } = useTranslation("common");
  const { billing } = useBilling();
  const { previewPlan, changePreviewPlan } = usePlanPreview();

  if (!previewPlan || !billing?.isPlanPreview) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs",
        ALERT_SEVERITY_BANNER_CLASS.info,
      )}
    >
      <IconEye className="size-3.5 shrink-0" />
      <span>
        {t("planPreview.banner", {
          plan: t(`planPreview.planNames.${billingPlanNameKey(billing)}`),
        })}
      </span>
      <Button variant="outline" onClick={() => changePreviewPlan(null)}>
        {t("planPreview.stop")}
      </Button>
    </div>
  );
}
