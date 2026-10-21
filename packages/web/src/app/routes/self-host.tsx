import { BlueprintBackdrop } from "@/components/blueprint-backdrop";
import { PublicAnnouncementBanner } from "@/components/public-announcement-banner";
import { PublicNav } from "@/components/public-nav";
import { useSelfHostChecklist } from "@/features/self-host/api/use-self-host-checklist";
import { useSelfHostSetup } from "@/features/self-host/api/use-self-host-setup";
import { SelfHostFooter } from "@/features/self-host/components/footer";
import { SelfHostGuideSection } from "@/features/self-host/components/guide-section";
import { SelfHostHero } from "@/features/self-host/components/hero";
import { SelfHostSetup } from "@/features/self-host/components/setup";
import { visibleSelfHostSections } from "@/features/self-host/lib/sections";
import { usePageMeta } from "@/hooks/use-page-meta";
import { SELF_HOST_PATH } from "@/lib/constants/self-host";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function SelfHostPage() {
  const { t } = useTranslation("selfhost");
  const { checked, toggle } = useSelfHostChecklist();
  const { host, auth } = useSelfHostSetup();
  const sections = useMemo(
    () => visibleSelfHostSections({ host, auth }),
    [host, auth],
  );
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: SELF_HOST_PATH,
  });

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <BlueprintBackdrop />
      <PublicAnnouncementBanner />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <SelfHostHero sections={sections} checked={checked} />
        <SelfHostSetup />
        {sections.map((section, index) => (
          <SelfHostGuideSection
            key={section.key}
            section={section}
            step={String(index + 2).padStart(2, "0")}
            checked={checked}
            toggle={toggle}
          />
        ))}
      </main>
      <SelfHostFooter />
    </div>
  );
}
