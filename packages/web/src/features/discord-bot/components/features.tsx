import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { IconPhotoCog } from "@tabler/icons-react";
import { MARKETING_CARD_CLASS } from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DISCORD_BOT_FEATURE_ICONS } from "@/lib/constants/discord-bot";

export function DiscordBotFeatures() {
  const { t } = useTranslation("discordBot");
  const features = t("features.items", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <section id="features" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          eyebrow={t("features.eyebrow")}
          heading={t("features.title")}
          subtitle={t("features.description")}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = DISCORD_BOT_FEATURE_ICONS[i] ?? IconPhotoCog;
            return (
              <div key={feature.title} className={cn(MARKETING_CARD_CLASS, "gap-3")}>
                <Icon aria-hidden className="size-5 text-primary" />
                <div>
                  <p className="font-heading text-sm font-semibold">
                    {feature.title}
                  </p>
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
