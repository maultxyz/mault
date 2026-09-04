import { SectionHeading } from "@/components/section-heading";
import { DISCORD_BOT_INSTALL_URL } from "@/lib/links";
import {
  IconBrandDiscord,
  IconKey,
  IconLink,
  IconSettingsBolt,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const STEP_ICONS = [IconBrandDiscord, IconKey, IconLink, IconSettingsBolt];

export function DiscordBotSetup() {
  const { t } = useTranslation("discordBot");
  const steps = t("setup.steps", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <section id="setup" className="border-t bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <SectionHeading
          align="left"
          heading={t("setup.title")}
          subtitle={t("setup.description")}
        />

        <ol className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? IconKey;
            return (
              <li key={step.title} className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-foreground/70" />
                    <p className="text-sm font-medium">{step.title}</p>
                  </div>
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
