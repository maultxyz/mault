import { SectionHeading } from "@/components/section-heading";
import { useTranslation } from "react-i18next";
import { DISCORD_BOT_COMMANDS } from "@/lib/constants/discord-bot";

export function DiscordBotCommands() {
  const { t } = useTranslation("discordBot");

  return (
    <section id="commands" className="border-t">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <SectionHeading
          align="left"
          heading={t("commands.title")}
          subtitle={t("commands.description")}
        />

        <div className="mt-8 overflow-hidden rounded-lg border bg-card">
          <div className="divide-y">
            {DISCORD_BOT_COMMANDS.map((key) => (
              <div
                key={key}
                className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <code className="shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground sm:w-52">
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
