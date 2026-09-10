import { DiscordBotCommands } from "@/features/discord-bot/components/commands";
import { DiscordBotFeatures } from "@/features/discord-bot/components/features";
import { DiscordBotFooter } from "@/features/discord-bot/components/footer";
import { DiscordBotHero } from "@/features/discord-bot/components/hero";
import { DiscordBotSetup } from "@/features/discord-bot/components/setup";
import { PublicGlow } from "@/components/public-glow";
import { PublicNav } from "@/components/public-nav";

export default function DiscordBotPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <PublicGlow />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <DiscordBotHero />
        <DiscordBotSetup />
        <DiscordBotCommands />
        <DiscordBotFeatures />
      </main>
      <DiscordBotFooter />
    </div>
  );
}
