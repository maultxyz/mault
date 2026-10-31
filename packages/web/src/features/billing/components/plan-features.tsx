import { billingPlanSettings } from "@/features/billing/lib/billing-plan-settings";
import { PRICING_SHARED_FEATURE_KEYS } from "@/lib/constants/pricing";
import type { PlanFeaturesProps } from "@/lib/interfaces/billing";
import { planBullets } from "@/lib/plan-bullets";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PlanFeatures({ billing }: PlanFeaturesProps) {
  const { t } = useTranslation("billing");
  const { t: tLanding } = useTranslation("landing");

  const features = [
    ...planBullets(
      billingPlanSettings(billing),
      MAX_CONNECTED_SORTERS,
      tLanding,
    ),
    ...PRICING_SHARED_FEATURE_KEYS.map((key) =>
      tLanding(`pricing.shared.${key}`),
    ),
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
        {t("includes")}
      </p>
      <ul className="flex flex-col gap-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <IconCheck size={16} className="mt-0.5 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
