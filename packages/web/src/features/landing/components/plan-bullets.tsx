import { PRICING_SHARED_FEATURE_KEYS } from "@/lib/constants/pricing";
import type { PlanBulletsProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { PLAN_FEATURE_KEYS } from "@magic-vault/shared";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PlanBullets({
  settings,
  maxConnectedSorters,
  emphasized = false,
}: PlanBulletsProps) {
  const { t } = useTranslation("landing");
  const { limits, features } = settings;
  const sorters = Math.min(
    limits.connectedSorters ?? maxConnectedSorters,
    maxConnectedSorters,
  );

  const planBullets = [
    limits.dailyScans == null
      ? t("pricing.business.unlimitedScans")
      : t("pricing.free.scanLimit", { limit: limits.dailyScans }),
    sorters > 1
      ? t("pricing.business.sorters", { count: sorters })
      : t("pricing.free.sorters", { count: sorters }),
    limits.soundRules == null
      ? t("pricing.business.soundRules")
      : t("pricing.free.soundRules", { count: limits.soundRules }),
    limits.notificationRules == null
      ? t("pricing.business.notificationRules")
      : t("pricing.free.notificationRules", {
          count: limits.notificationRules,
        }),
    ...PLAN_FEATURE_KEYS.filter((key) => features[key]).map((key) =>
      t(`pricing.business.${key}`),
    ),
  ];
  const sharedBullets = PRICING_SHARED_FEATURE_KEYS.map((key) =>
    t(`pricing.shared.${key}`),
  );

  return (
    <ul className="flex flex-1 flex-col gap-2.5">
      {planBullets.map((bullet) => (
        <li
          key={bullet}
          className={cn(
            "flex items-start gap-2 text-sm",
            emphasized && "font-medium",
          )}
        >
          <IconCheck size={16} className="mt-0.5 shrink-0 text-primary" />
          {bullet}
        </li>
      ))}
      {sharedBullets.map((bullet) => (
        <li key={bullet} className="flex items-start gap-2 text-sm">
          <IconCheck size={16} className="mt-0.5 shrink-0 text-primary" />
          {bullet}
        </li>
      ))}
    </ul>
  );
}
