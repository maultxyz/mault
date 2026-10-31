import { PRICING_COMPARISON_ID } from "@/lib/constants/pricing";
import type { PlanBulletsProps } from "@/lib/interfaces/landing";
import { planHighlightBullets } from "@/lib/plan-bullets";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PlanBullets({
  settings,
  maxConnectedSorters,
  emphasized = false,
}: PlanBulletsProps) {
  const { t } = useTranslation("landing");
  const bullets = planHighlightBullets(settings, maxConnectedSorters, t);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ul className="flex flex-col gap-2.5">
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
      </ul>
      <a
        href={`#${PRICING_COMPARISON_ID}`}
        className="mt-auto text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("pricing.compare.seeAll")}
      </a>
    </div>
  );
}
