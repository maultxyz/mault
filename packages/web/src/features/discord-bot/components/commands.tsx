import { MarketingRule } from "@/components/marketing-rule";
import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { useTranslation } from "react-i18next";
import { DISCORD_BOT_COMMANDS } from "@/lib/constants/discord-bot";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";

export function DiscordBotCommands({ step }: MarketingStepProps) {
  const { t } = useTranslation("discordBot");

  return (
    <section id="commands" className="border-t">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("commands.eyebrow")}
          heading={t("commands.title")}
          subtitle={t("commands.description")}
        />

        <div className="mt-10 overflow-hidden rounded-lg border bg-card">
          <MarketingRule
            lead={String(DISCORD_BOT_COMMANDS.length).padStart(2, "0")}
            label={t("commands.eyebrow")}
            className="px-5 pt-3"
          />
          <div className="divide-y">
            {DISCORD_BOT_COMMANDS.map((key) => (
              <div
                key={key}
                className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <code className="shrink-0 font-heading text-sm font-semibold text-primary sm:w-52">
                  {t(`commands.items.${key}.usage`)}
                </code>
                <p className="text-sm/relaxed text-foreground/70">
                  {t(`commands.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
