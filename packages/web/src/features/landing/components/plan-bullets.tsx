import { PRICING_SHARED_FEATURE_KEYS } from "@/lib/constants/pricing";
import type { PlanBulletsProps } from "@/lib/interfaces/landing";
import { planBullets } from "@/lib/plan-bullets";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PlanBullets({
  settings,
  maxConnectedSorters,
  emphasized = false,
}: PlanBulletsProps) {
  const { t } = useTranslation("landing");
  const bullets = planBullets(settings, maxConnectedSorters, t);
  const sharedBullets = PRICING_SHARED_FEATURE_KEYS.map((key) =>
    t(`pricing.shared.${key}`),
  );

  return (
    <ul className="flex flex-1 flex-col gap-2.5">
      {bullets.map((bullet) => (
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
