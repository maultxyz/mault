import { BuildTableOfContents } from "@/features/build/components/table-of-contents";
import { useTranslation } from "react-i18next";

export function BuildHero() {
  const { t } = useTranslation("build");

  return (
    <section className="mx-auto max-w-4xl px-4 pt-8 pb-2">
      <p className="text-sm font-semibold text-primary">{t("hero.eyebrow")}</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl lg:text-4xl">
        {t("hero.title")}
      </h1>

      <BuildTableOfContents />
    </section>
  );
}
