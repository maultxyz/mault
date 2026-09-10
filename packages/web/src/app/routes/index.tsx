import { LandingCta } from "@/features/landing/components/cta";
import { LandingFeatures } from "@/features/landing/components/features";
import { LandingFooter } from "@/features/landing/components/footer";
import { LandingHero } from "@/features/landing/components/hero";
import { LandingOpenSource } from "@/features/landing/components/open-source";
import { LandingPipeline } from "@/features/landing/components/pipeline";
import { LandingPricing } from "@/features/landing/components/pricing";
import { LandingStats } from "@/features/landing/components/stats";
import { LandingSupportedGames } from "@/features/landing/components/supported-games";
import { PublicGlow } from "@/components/public-glow";
import { PublicNav } from "@/components/public-nav";
import { AUTH_PROVIDER } from "@/lib/auth/provider";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <PublicGlow />
      <PublicNav />
      <main className="flex-1">
        <LandingHero />
        <LandingStats />
        <LandingSupportedGames />
        <LandingPipeline />
        <LandingFeatures />
        <LandingOpenSource />
        {AUTH_PROVIDER !== "local" && <LandingPricing />}
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
