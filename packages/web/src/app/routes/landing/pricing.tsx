import { usePublicPricing } from "@/app/routes/landing/use-public-pricing";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const SHARED_FEATURE_KEYS = [
  "collections",
  "games",
  "notifications",
] as const;

function formatPrice(amount: number, currency: string, locale: string) {
  const fractionDigits = amount % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount / 100);
}

export function LandingPricing() {
  const { t, i18n } = useTranslation("landing");
  const pricing = usePublicPricing();

  const businessPrice = pricing?.business
    ? formatPrice(
        pricing.business.amount,
        pricing.business.currency,
        i18n.language,
      )
    : null;

  return (
    <section id="pricing" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
            {t("pricing.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-6 rounded-xl border p-6">
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("pricing.free.name")}
              </p>
              <p className="mt-3 font-heading text-3xl font-semibold">
                {t("pricing.free.price")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("pricing.free.description")}
              </p>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5">
              <li className="flex items-start gap-2 text-sm">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                {t("pricing.free.scanLimit", {
                  limit: pricing?.freeDailyScanLimit ?? 50,
                })}
              </li>
              {SHARED_FEATURE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <IconCheck
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  {t(`pricing.shared.${key}`)}
                </li>
              ))}
            </ul>
            <Link
              to="/auth/sign-up"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t("pricing.free.cta")}
            </Link>
          </div>

          <div className="flex flex-col gap-6 rounded-xl border border-primary/50 bg-primary/5 p-6 shadow-sm shadow-primary/10">
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("pricing.business.name")}
              </p>
              <p className="mt-3 font-heading text-3xl font-semibold">
                {businessPrice ?? "—"}
                {businessPrice && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("pricing.business.perMonth")}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("pricing.business.description")}
              </p>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5">
              <li className="flex items-start gap-2 text-sm font-medium">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                {t("pricing.business.unlimitedScans")}
              </li>
              {SHARED_FEATURE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <IconCheck
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  {t(`pricing.shared.${key}`)}
                </li>
              ))}
            </ul>
            <Link
              to="/auth/sign-up"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              {t("pricing.business.cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
