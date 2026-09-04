import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingCta() {
  const { t } = useTranslation("landing");

  return (
    <section className="border-t">
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-64 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]"
        />
        <h2 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
          {t("cta.heading")}
        </h2>
        <p className="max-w-md text-sm/relaxed text-foreground/70 md:text-base/relaxed">
          {t("cta.subtitle")}
        </p>
        <Link
          to="/auth/sign-up"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "mt-2",
          )}
        >
          {t("cta.button")}
          <IconArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
