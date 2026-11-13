import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { LandingFooter } from "@/features/landing/components/footer";
import { PublicBackdrop } from "@/components/public-backdrop";
import { PublicNav } from "@/components/public-nav";
import { LEGAL_EFFECTIVE_DATE as EFFECTIVE_DATE } from "@/lib/constants/legal";
import { CONTACT_EMAIL } from "@/lib/constants/links";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useTranslation } from "react-i18next";
import type { LegalSection } from "@/lib/interfaces/legal";

function withContactEmail(text: string) {
  return text.replace("{{email}}", CONTACT_EMAIL);
}

export function LegalPage({ page }: { page: "privacy" | "terms" }) {
  const { t, i18n } = useTranslation("legal");
  usePageMeta({
    title: t(`meta.${page}.title`),
    description: t(`meta.${page}.description`),
    path: `/${page}`,
  });
  const intro = t(`${page}.intro`, { returnObjects: true }) as string[];
  const sections = t(`${page}.sections`, {
    returnObjects: true,
  }) as LegalSection[];
  const updatedDate = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(EFFECTIVE_DATE));

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background text-foreground">
      <PublicBackdrop />
      <PublicNav />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-16 md:pt-24 md:pb-24">
          <div className="max-w-3xl">
            <h1 className="font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl">
              {t(`${page}.title`)}
            </h1>
            <p className="mt-4 font-heading text-2xs tracking-widest text-foreground/70 uppercase">
              {t("effectiveDateLabel", { date: updatedDate })}
            </p>
            <div className="mt-8 flex flex-col gap-3 text-base/relaxed text-foreground/70">
              {intro.map((paragraph, i) => (
                <p key={i}>{withContactEmail(paragraph)}</p>
              ))}
            </div>
            {sections.map((section) => (
              <section key={section.heading} className="mt-10">
                <h2 className="font-heading text-2xl font-semibold tracking-tight">
                  {section.heading}
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-base/relaxed text-foreground/70">
                  {section.body.map((paragraph, i) => (
                    <p key={i}>{withContactEmail(paragraph)}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
