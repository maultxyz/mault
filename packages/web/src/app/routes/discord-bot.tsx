import { DiscordBotCommands } from "@/features/discord-bot/components/commands";
import { DiscordBotFeatures } from "@/features/discord-bot/components/features";
import { GuideFooter } from "@/components/guide-footer";
import { DiscordBotHero } from "@/features/discord-bot/components/hero";
import { DiscordBotSetup } from "@/features/discord-bot/components/setup";
import { BlueprintBackdrop } from "@/components/blueprint-backdrop";
import { PublicNav } from "@/components/public-nav";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useTranslation } from "react-i18next";

export default function DiscordBotPage() {
  const { t } = useTranslation("discordBot");
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/discord-bot",
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <BlueprintBackdrop />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <DiscordBotHero />
        <DiscordBotSetup step="01" />
        <DiscordBotCommands step="02" />
        <DiscordBotFeatures step="03" />
      </main>
      <GuideFooter showSignInLink />
    </div>
  );
}
