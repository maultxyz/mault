import { DEMO_SCANNED_CARDS } from "@/app/routes/landing/demo-cards";
import { DemoCardTile } from "@/app/routes/landing/demo-scanned-card";
import { buttonVariants } from "@/components/ui/button";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingHero() {
  const { t } = useTranslation("landing");
  const { t: tScanner } = useTranslation("scanner");

  const stats = useMemo(() => {
    const uniqueIds = new Set(DEMO_SCANNED_CARDS.map((d) => d.card.id));
    let totalValue = 0;
    for (const d of DEMO_SCANNED_CARDS) {
      const price = (d.isFoil ? d.card.priceFoil : d.card.price) ?? d.card.price;
      totalValue += price ?? 0;
    }

    return {
      totalCount: DEMO_SCANNED_CARDS.length,
      uniqueCount: uniqueIds.size,
      totalValue,
      avgValue: totalValue / DEMO_SCANNED_CARDS.length,
    };
  }, []);

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-16 pb-16 md:grid-cols-2 md:pt-20 md:pb-20">
      <div className="flex flex-col items-start gap-6">
        <h1 className="text-5xl font-heading font-semibold leading-[0.95] tracking-tight text-balance md:text-6xl lg:text-7xl">
          <Trans
            t={t}
            i18nKey="hero.title"
            components={{
              br: <br />,
              highlight: <span className="text-primary" />,
            }}
          />
        </h1>
        <p className="max-w-md text-sm/relaxed text-muted-foreground md:text-base/relaxed">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            to="/auth/sign-up"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "shadow-sm shadow-primary/30 transition-shadow hover:shadow-md hover:shadow-primary/30",
            )}
          >
            {t("hero.getStartedFree")}
            <IconArrowRight size={16} />
          </Link>
          <a
            href="#how-it-works"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            {t("hero.seeHowItWorks")}
          </a>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/10 blur-2xl" />
        <div className="-rotate-1 rounded-xl bg-card p-3 shadow-xl shadow-black/5 ring-1 ring-foreground/10 transition-transform duration-300 hover:rotate-0 dark:shadow-black/40">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("hero.currentSession")}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {t("hero.cardCount", { count: DEMO_SCANNED_CARDS.length })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_SCANNED_CARDS.map((d) => (
              <DemoCardTile
                key={d.card.id}
                card={d.card}
                binNumber={d.binNumber}
                isFoil={d.isFoil}
              />
            ))}
          </div>
        </div>

        <div className="absolute -right-4 -bottom-6 z-10 w-60 rounded-xl bg-card/95 shadow-xl shadow-black/10 ring-1 ring-foreground/10 backdrop-blur-sm sm:-right-8 sm:w-64 dark:shadow-black/40">
          <div className="grid grid-cols-2 divide-x divide-y divide-border">
            <div className="p-2.5">
              <p className="text-[10px] font-medium whitespace-nowrap text-muted-foreground uppercase tracking-wide">
                {tScanner("scanStats.totalCards")}
              </p>
              <p className="text-sm font-semibold whitespace-nowrap">
                {stats.totalCount}
              </p>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-medium whitespace-nowrap text-muted-foreground uppercase tracking-wide">
                {tScanner("scanStats.unique")}
              </p>
              <p className="text-sm font-semibold whitespace-nowrap">
                {stats.uniqueCount}
              </p>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-medium whitespace-nowrap text-muted-foreground uppercase tracking-wide">
                {tScanner("scanStats.totalValue")}
              </p>
              <p className="text-sm font-semibold whitespace-nowrap">
                {formatUsd(stats.totalValue)}
              </p>
            </div>
            <div className="p-2.5">
              <p className="text-[10px] font-medium whitespace-nowrap text-muted-foreground uppercase tracking-wide">
                {tScanner("scanStats.avgValue")}
              </p>
              <p className="text-sm font-semibold whitespace-nowrap">
                {formatUsd(stats.avgValue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
