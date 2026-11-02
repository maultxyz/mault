import { BlueprintBackdrop } from "@/components/blueprint-backdrop";
import { SpiderWeb } from "@/components/halloween-decor";
import { LandingCta } from "@/features/landing/components/cta";
import { LandingFeatures } from "@/features/landing/components/features";
import { LandingFooter } from "@/features/landing/components/footer";
import { LandingHero } from "@/features/landing/components/hero";
import { LandingOpenSource } from "@/features/landing/components/open-source";
import { LandingPricing } from "@/features/landing/components/pricing";
import { LandingSupportedGames } from "@/features/landing/components/supported-games";
import { PublicAnnouncementBanner } from "@/components/public-announcement-banner";
import { PublicNav } from "@/components/public-nav";
import { usePageMeta } from "@/hooks/use-page-meta";
import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { useTranslation } from "react-i18next";

export default function LandingPage() {
  const { t } = useTranslation("landing");
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/",
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <BlueprintBackdrop />
      <SpiderWeb corner="top-right" withSpider className="size-28 max-md:size-16" />
      <PublicAnnouncementBanner />
      <PublicNav />
      <main className="flex-1">
        <LandingHero />
        <LandingSupportedGames />
        <LandingFeatures step="01" />
        <LandingOpenSource step="02" />
        {AUTH_PROVIDER !== "local" && <LandingPricing step="03" />}
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
