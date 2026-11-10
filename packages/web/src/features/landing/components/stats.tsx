import { useTranslation } from "react-i18next";
import { useLandingStats } from "@/features/landing/api/use-landing-stats";

export function LandingStats() {
  const { t } = useTranslation("landing");
  const stats = useLandingStats();

  return (
    <div className="grid grid-cols-2 gap-px border-t bg-border md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.key} className="flex flex-col gap-1.5 bg-card p-5">
          <span className="text-3xl font-heading font-semibold tracking-tight tabular-nums md:text-4xl">
            {stat.value}
          </span>
          <span className="text-xs text-foreground/70">
            {t(`stats.items.${stat.key}`)}
          </span>
        </div>
      ))}
    </div>
  );
}
