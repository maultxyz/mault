import { GuideHero } from "@/components/guide/guide-hero";
import { GuideTableOfContents } from "@/components/guide/guide-table-of-contents";
import { useBuildToc } from "@/features/build/api/use-build-toc";
import { useTranslation } from "react-i18next";

export function BuildHero() {
  const { t } = useTranslation("build");
  const entries = useBuildToc();

  return (
    <GuideHero eyebrow={t("hero.eyebrow")} title={t("hero.title")}>
      <GuideTableOfContents entries={entries} />
    </GuideHero>
  );
}
