import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { DISCORD_BOT_INSTALL_URL } from "@/lib/constants/links";
import { IconKey } from "@tabler/icons-react";
import { MARKETING_CARD_CLASS } from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DISCORD_BOT_SETUP_STEP_ICONS } from "@/lib/constants/discord-bot";

export function DiscordBotSetup() {
  const { t } = useTranslation("discordBot");
  const steps = t("setup.steps", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <section id="setup" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          eyebrow={t("setup.eyebrow")}
          heading={t("setup.title")}
          subtitle={t("setup.description")}
        />

        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = DISCORD_BOT_SETUP_STEP_ICONS[i] ?? IconKey;
            return (
              <li key={step.title} className={cn(MARKETING_CARD_CLASS, "gap-4")}>
                <div className="flex items-center justify-between gap-2">
                  <Icon aria-hidden className="size-5 text-primary" />
                  <span className="font-heading text-2xs font-medium tracking-widest text-foreground/70 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <p className="font-heading text-sm font-semibold">
                    {step.title}
                  </p>
                  <p className="text-sm/relaxed text-foreground/70">
                    {step.description}
                  </p>
                  {i === 0 && (
                    <a
                      href={DISCORD_BOT_INSTALL_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t("setup.installLink")}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
