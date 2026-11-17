import { useTranslation } from "react-i18next";
import { useLandingStats } from "@/features/landing/api/use-landing-stats";

export function LandingStats() {
  const { t } = useTranslation("landing");
  const stats = useLandingStats();

  return (
    <div className="grid grid-cols-2 gap-px border-t bg-border md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.key} className="flex flex-col gap-3 bg-card p-5">
          <span className="font-heading text-2xs font-medium tracking-widest text-foreground/70 uppercase">
            {t(`stats.items.${stat.key}`)}
          </span>
          <span className="font-heading text-3xl font-bold tracking-tight text-primary tabular-nums md:text-4xl">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
