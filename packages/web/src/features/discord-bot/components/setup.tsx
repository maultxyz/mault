import { MarketingRule } from "@/components/marketing-rule";
import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { DISCORD_BOT_INSTALL_URL } from "@/lib/constants/links";
import { IconKey } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { DISCORD_BOT_SETUP_STEP_ICONS } from "@/lib/constants/discord-bot";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";

export function DiscordBotSetup({ step: section }: MarketingStepProps) {
  const { t } = useTranslation("discordBot");
  const steps = t("setup.steps", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <section id="setup" className="border-t">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <MarketingSectionHeader
          step={section}
          eyebrow={t("setup.eyebrow")}
          heading={t("setup.title")}
          subtitle={t("setup.description")}
        />

        <ol className="mt-10 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = DISCORD_BOT_SETUP_STEP_ICONS[i] ?? IconKey;
            return (
              <li key={step.title} className="flex flex-col gap-4 bg-card p-5">
                <MarketingRule
                  lead={`${section}.${String(i + 1).padStart(2, "0")}`}
                  aside={<Icon className="size-4" />}
                />
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
