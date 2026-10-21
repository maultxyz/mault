import { MarketingRule } from "@/components/marketing-rule";
import { BuildTableOfContents } from "@/features/build/components/table-of-contents";
import { useTranslation } from "react-i18next";

export function BuildHero() {
  const { t } = useTranslation("build");

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-2 md:pt-14">
      <MarketingRule lead="Mault" label={t("hero.eyebrow")} />
      <h1 className="mt-6 font-heading text-4xl leading-[0.95] font-semibold tracking-tight text-balance md:text-5xl">
        {t("hero.title")}
      </h1>

      <BuildTableOfContents />
    </section>
  );
}
