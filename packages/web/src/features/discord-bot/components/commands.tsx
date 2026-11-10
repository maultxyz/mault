import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { useTranslation } from "react-i18next";
import { DISCORD_BOT_COMMANDS } from "@/lib/constants/discord-bot";

export function DiscordBotCommands() {
  const { t } = useTranslation("discordBot");

  return (
    <section id="commands" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <MarketingSectionHeader
          eyebrow={t("commands.eyebrow")}
          heading={t("commands.title")}
          subtitle={t("commands.description")}
        />

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-lg bg-card ring-1 ring-border">
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
