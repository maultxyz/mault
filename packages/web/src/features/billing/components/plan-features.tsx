import { PRICING_SHARED_FEATURE_KEYS } from "@/lib/constants/pricing";
import type { PlanFeaturesProps } from "@/lib/interfaces/billing";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PlanFeatures({ billing }: PlanFeaturesProps) {
  const { t } = useTranslation("billing");
  const { t: tLanding } = useTranslation("landing");
  const isBusiness = billing.plan === "business";

  const features = [
    billing.dailyLimit == null
      ? tLanding("pricing.business.unlimitedScans")
      : tLanding("pricing.free.scanLimit", { limit: billing.dailyLimit }),
    billing.maxConnectedSorters != null &&
      tLanding(
        isBusiness ? "pricing.business.sorters" : "pricing.free.sorters",
        { count: billing.maxConnectedSorters },
      ),
    billing.maxSoundRules == null
      ? tLanding("pricing.business.soundRules")
      : tLanding("pricing.free.soundRules", { count: billing.maxSoundRules }),
    billing.maxNotificationRules == null
      ? tLanding("pricing.business.notificationRules")
      : tLanding("pricing.free.notificationRules", {
          count: billing.maxNotificationRules,
        }),
    billing.chaosSort && tLanding("pricing.business.chaosSort"),
    ...PRICING_SHARED_FEATURE_KEYS.map((key) =>
      tLanding(`pricing.shared.${key}`),
    ),
  ].filter((feature): feature is string => !!feature);

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
