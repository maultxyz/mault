import type { MarketingSectionHeaderProps } from "@/lib/interfaces/marketing-section-header";

export function MarketingSectionHeader({
  eyebrow,
  heading,
  subtitle,
}: MarketingSectionHeaderProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
      <p className="font-heading text-2xs font-medium tracking-widest text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
        {heading}
      </h2>
      <p className="max-w-2xl text-base/relaxed text-foreground/70 md:text-lg/relaxed">
        {subtitle}
      </p>
    </div>
  );
}
