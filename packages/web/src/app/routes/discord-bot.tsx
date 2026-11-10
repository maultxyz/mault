import { DiscordBotCommands } from "@/features/discord-bot/components/commands";
import { DiscordBotFeatures } from "@/features/discord-bot/components/features";
import { GuideFooter } from "@/components/guide-footer";
import { DiscordBotHero } from "@/features/discord-bot/components/hero";
import { DiscordBotSetup } from "@/features/discord-bot/components/setup";
import { PublicBackdrop } from "@/components/public-backdrop";
import { PublicNav } from "@/components/public-nav";
import { usePageMeta } from "@/hooks/use-page-meta";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { useTranslation } from "react-i18next";

export default function DiscordBotPage() {
  const { t } = useTranslation("discordBot");
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/discord-bot",
  });

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <PublicBackdrop />
      <PublicNav />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
        <DiscordBotHero />
        <DiscordBotSetup />
        <DiscordBotCommands />
        <DiscordBotFeatures />
      </main>
      <GuideFooter showSignInLink />
    </div>
  );
}
