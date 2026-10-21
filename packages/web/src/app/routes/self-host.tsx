import { GuideHero } from "@/components/guide/guide-hero";
import { GuidePage } from "@/components/guide/guide-page";
import { GuideTableOfContents } from "@/components/guide/guide-table-of-contents";
import { useSelfHostChecklist } from "@/features/self-host/api/use-self-host-checklist";
import { useSelfHostSetup } from "@/features/self-host/api/use-self-host-setup";
import { useSelfHostToc } from "@/features/self-host/api/use-self-host-toc";
import { SelfHostFooter } from "@/features/self-host/components/footer";
import { SelfHostGuideSection } from "@/features/self-host/components/guide-section";
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
  const toc = useSelfHostToc(sections, checked);
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: SELF_HOST_PATH,
  });

  return (
    <GuidePage footer={<SelfHostFooter />}>
      <GuideHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
      >
        <GuideTableOfContents entries={toc} />
      </GuideHero>
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
    </GuidePage>
  );
}
