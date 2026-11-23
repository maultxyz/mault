import { GuideHero } from "@/components/guide/guide-hero";
import { GuideTableOfContents } from "@/components/guide/guide-table-of-contents";
import { Button } from "@/components/ui/button";
import { useBuildToc } from "@/features/build/api/use-build-toc";
import { PRINT_FILES_URL } from "@/lib/constants/links";
import { IconCube, IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function BuildHero() {
  const { t } = useTranslation("build");
  const { t: tCommon } = useTranslation("common");
  const entries = useBuildToc();

  return (
    <GuideHero eyebrow={t("hero.eyebrow")} title={t("hero.title")}>
      <div className="mt-6 flex flex-wrap gap-1.5">
        <Button
          size="marketing"
          nativeButton={false}
          render={<a href={PRINT_FILES_URL} target="_blank" rel="noopener noreferrer" />}
        >
          <IconCube />
          {t("hero.printFiles")}
          <IconExternalLink />
          <span className="sr-only">{tCommon("publicNav.opensInNewTab")}</span>
        </Button>
      </div>
      <GuideTableOfContents entries={entries} />
    </GuideHero>
  );
}
