import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingCta() {
  const { t } = useTranslation("landing");

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
      <div className="rounded-lg bg-primary text-primary-foreground px-6 py-14 text-center md:px-10 md:py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
          <p className="font-heading text-2xs font-medium tracking-widest text-primary-foreground/90 uppercase">
            {t("cta.eyebrow")}
          </p>
          <h2 className="text-4xl leading-[1.05] font-heading font-semibold tracking-tight text-balance md:text-6xl">
            {t("cta.heading")}
          </h2>
          <p className="max-w-md text-base/relaxed md:text-lg/relaxed">
            {t("cta.subtitle")}
          </p>
          <Link
            to="/auth/sign-up"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "mt-2",
            )}
          >
            {t("getStartedFree")}
            <IconArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
