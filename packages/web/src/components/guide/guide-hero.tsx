import type { GuideHeroProps } from "@/lib/interfaces/guide";

export function GuideHero({
  eyebrow,
  title,
  description,
  children,
}: GuideHeroProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-2 md:pt-24">
      <p className="font-heading text-2xs font-medium tracking-widest text-primary uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-6 max-w-4xl font-heading text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl">
        {title}
      </h1>
      {description && (
        <p className="mt-6 max-w-2xl text-base/relaxed text-foreground/70 md:text-lg/relaxed">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
