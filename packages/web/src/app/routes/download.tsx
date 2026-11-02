import { DownloadFeatures } from "@/features/download/components/features";
import { GuideFooter } from "@/components/guide-footer";
import { DownloadHero } from "@/features/download/components/hero";
import { DownloadInstall } from "@/features/download/components/install";
import { DownloadPlatforms } from "@/features/download/components/platforms";
import { BlueprintBackdrop } from "@/components/blueprint-backdrop";
import { PublicNav } from "@/components/public-nav";
import { usePageMeta } from "@/hooks/use-page-meta";
import { DOWNLOAD_PATH } from "@/lib/constants/download";
import { useTranslation } from "react-i18next";

export default function DownloadPage() {
  const { t } = useTranslation("download");
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: DOWNLOAD_PATH,
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <BlueprintBackdrop />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <DownloadHero />
        <DownloadPlatforms step="01" />
        <DownloadFeatures step="02" />
        <DownloadInstall step="03" />
      </main>
      <GuideFooter showSignInLink />
    </div>
  );
}
