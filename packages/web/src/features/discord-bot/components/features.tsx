import { SectionHeading } from "@/components/section-heading";
import {
  IconAlertTriangle,
  IconChartBar,
  IconMoodSmile,
  IconPhotoCog,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const FEATURE_ICONS = [
  IconPhotoCog,
  IconAlertTriangle,
  IconChartBar,
  IconMoodSmile,
] as const;

export function DiscordBotFeatures() {
  const { t } = useTranslation("discordBot");
  const features = t("features.items", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <section id="features" className="border-t bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <SectionHeading
          align="left"
          heading={t("features.title")}
          subtitle={t("features.description")}
        />

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? IconPhotoCog;
            return (
              <div key={feature.title} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-sm/relaxed text-foreground/70">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
