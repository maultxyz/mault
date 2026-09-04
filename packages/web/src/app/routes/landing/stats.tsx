import { useTranslation } from "react-i18next";
import { useLandingStats } from "@/app/routes/landing/use-landing-stats";

export function LandingStats() {
  const { t } = useTranslation("landing");
  const stats = useLandingStats();

  return (
    <section className="border-t">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 divide-border px-4 py-10 md:grid-cols-4 md:divide-x">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="flex flex-col gap-1 md:px-6 md:first:pl-0 md:last:pr-0"
          >
            <span className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
              {stat.value}
            </span>
            <span className="text-sm/relaxed text-foreground/70">
              {t(`stats.items.${stat.key}`)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
