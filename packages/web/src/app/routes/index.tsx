import { LandingCta } from "@/app/routes/landing/cta";
import { LandingFeatures } from "@/app/routes/landing/features";
import { LandingFooter } from "@/app/routes/landing/footer";
import { LandingHero } from "@/app/routes/landing/hero";
import { LandingNav } from "@/app/routes/landing/nav";
import { LandingOpenSource } from "@/app/routes/landing/open-source";
import { LandingPipeline } from "@/app/routes/landing/pipeline";
import { LandingPricing } from "@/app/routes/landing/pricing";
import { LandingStats } from "@/app/routes/landing/stats";
import { LandingSupportedGames } from "@/app/routes/landing/supported-games";
import { PublicGlow } from "@/components/public-glow";
import { AUTH_PROVIDER } from "@/lib/auth/provider";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <PublicGlow />
      <LandingNav />
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
