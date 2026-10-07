import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingCta() {
  const { t } = useTranslation("landing");

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
      <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
        />
        <h2 className="relative max-w-2xl font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
          {t("cta.heading")}
        </h2>
        <p className="relative max-w-md text-sm/relaxed text-primary-foreground/80 md:text-base/relaxed">
          {t("cta.subtitle")}
        </p>
        <Link
          to="/auth/sign-up"
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "relative mt-2",
          )}
        >
          {t("getStartedFree")}
          <IconArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
