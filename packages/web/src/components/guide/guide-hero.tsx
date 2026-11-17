import { MarketingRule } from "@/components/marketing-rule";
import type { GuideHeroProps } from "@/lib/interfaces/guide";

export function GuideHero({
  eyebrow,
  title,
  description,
  children,
}: GuideHeroProps) {
  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-2 md:pt-14">
      <MarketingRule lead="Mault" label={eyebrow} />
      <h1 className="mt-6 font-heading text-4xl leading-[0.95] font-semibold tracking-tight text-balance md:text-5xl">
        {title}
      </h1>
      {description && (
        <p className="mt-5 max-w-2xl text-sm/relaxed text-foreground/70 md:text-base/relaxed">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
