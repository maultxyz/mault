import { DiscordBotCommands } from "@/app/routes/discord-bot/commands";
import { DiscordBotFeatures } from "@/app/routes/discord-bot/features";
import { DiscordBotFooter } from "@/app/routes/discord-bot/footer";
import { DiscordBotHero } from "@/app/routes/discord-bot/hero";
import { DiscordBotSetup } from "@/app/routes/discord-bot/setup";
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
