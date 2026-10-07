import { buttonVariants } from "@/components/ui/button";
import { LandingSectionHeader } from "@/features/landing/components/section-header";
import { usePublicPricing } from "@/features/landing/api/use-public-pricing";
import { PlanBullets } from "@/features/landing/components/plan-bullets";
import { DEFAULT_PUBLIC_PLAN_CONFIG } from "@/lib/constants/pricing";
import { cn } from "@/lib/utils";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
  const plans = pricing?.plans ?? DEFAULT_PUBLIC_PLAN_CONFIG;
  const maxConnectedSorters =
    pricing?.maxConnectedSorters ?? MAX_CONNECTED_SORTERS;

  const businessPrice = pricing?.business
    ? formatPrice(
        pricing.business.amount,
        pricing.business.currency,
        i18n.language,
      )
    : null;

  return (
    <section id="pricing" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <LandingSectionHeader
          eyebrow={t("pricing.eyebrow")}
          heading={t("pricing.heading")}
          subtitle={t("pricing.subtitle")}
          centered
        />

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-6 rounded-xl border p-6">
            <div>
              <p className="font-heading text-sm font-semibold">
                {t("pricing.free.name")}
              </p>
              <p className="mt-3 font-heading text-3xl font-semibold">
                {t("pricing.free.price")}
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                {t("pricing.free.description")}
              </p>
            </div>
            <PlanBullets
              settings={plans.free}
              maxConnectedSorters={maxConnectedSorters}
            />
            <Link
              to="/auth/sign-up"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t("getStartedFree")}
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
                  <span className="text-sm font-normal text-foreground/70">
                    {t("pricing.business.perMonth")}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                {t("pricing.business.description")}
              </p>
            </div>
            <PlanBullets
              settings={plans.business}
              maxConnectedSorters={maxConnectedSorters}
              emphasized
            />
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
