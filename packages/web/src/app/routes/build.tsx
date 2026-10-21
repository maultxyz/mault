import { GuidePage } from "@/components/guide/guide-page";
import { BuildAssembly } from "@/features/build/components/assembly";
import { BuildBom } from "@/features/build/components/bom";
import { BuildFooter } from "@/features/build/components/footer";
import { BuildHero } from "@/features/build/components/hero";
import { BuildSetup } from "@/features/build/components/setup";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useTranslation } from "react-i18next";

export default function BuildGuidePage() {
  const { t } = useTranslation("build");
  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/build",
  });

  return (
    <GuidePage footer={<BuildFooter />}>
      <BuildHero />
      <BuildSetup />
      <BuildBom />
      <BuildAssembly />
    </GuidePage>
  );
}
