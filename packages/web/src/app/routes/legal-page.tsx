import { LandingFooter } from "@/app/routes/landing/footer";
import { PublicGlow } from "@/components/public-glow";
import { PublicNav } from "@/components/public-nav";
import { CONTACT_EMAIL } from "@/lib/links";
import { useTranslation } from "react-i18next";

interface LegalSection {
  heading: string;
  body: string[];
}

function withContactEmail(text: string) {
  return text.replace("{{email}}", CONTACT_EMAIL);
}

const EFFECTIVE_DATE = "2026-09-04";

export function LegalPage({ page }: { page: "privacy" | "terms" }) {
  const { t, i18n } = useTranslation("legal");
  const intro = t(`${page}.intro`, { returnObjects: true }) as string[];
  const sections = t(`${page}.sections`, {
    returnObjects: true,
  }) as LegalSection[];
  const updatedDate = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "long",
  }).format(new Date(EFFECTIVE_DATE));

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <PublicGlow />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-16">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {t(`${page}.title`)}
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            {t("effectiveDateLabel", { date: updatedDate })}
          </p>
          <div className="mt-6 flex flex-col gap-3 text-sm/relaxed text-foreground/80">
            {intro.map((paragraph, i) => (
              <p key={i}>{withContactEmail(paragraph)}</p>
            ))}
          </div>
          {sections.map((section) => (
            <section key={section.heading} className="mt-8">
              <h2 className="font-heading text-xl font-semibold">
                {section.heading}
              </h2>
              <div className="mt-3 flex flex-col gap-3 text-sm/relaxed text-foreground/80">
                {section.body.map((paragraph, i) => (
                  <p key={i}>{withContactEmail(paragraph)}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
