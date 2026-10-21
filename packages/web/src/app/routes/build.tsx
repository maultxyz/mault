import { BuildAssembly } from "@/features/build/components/assembly";
import { BuildBom } from "@/features/build/components/bom";
import { BuildFooter } from "@/features/build/components/footer";
import { BuildHero } from "@/features/build/components/hero";
import { BuildSetup } from "@/features/build/components/setup";
import { PublicAnnouncementBanner } from "@/components/public-announcement-banner";
import { BlueprintBackdrop } from "@/components/blueprint-backdrop";
import { PublicNav } from "@/components/public-nav";
import { useScrollToHash } from "@/features/build/api/use-scroll-to-hash";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useTranslation } from "react-i18next";

export default function BuildGuidePage() {
  const { t } = useTranslation("build");
  useScrollToHash();
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/build",
  });

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <BlueprintBackdrop />
      <PublicAnnouncementBanner />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <BuildHero />
        <BuildSetup />
        <BuildBom />
        <BuildAssembly />
      </main>
      <BuildFooter />
    </div>
  );
}
