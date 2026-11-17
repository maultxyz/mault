import { MarketingRule } from "@/components/marketing-rule";
import type { MarketingSectionHeaderProps } from "@/lib/interfaces/marketing-rule";

export function MarketingSectionHeader({
  step,
  eyebrow,
  heading,
  subtitle,
}: MarketingSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <MarketingRule lead={step} label={eyebrow} />
      <div className="flex max-w-3xl flex-col gap-4">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
          {heading}
        </h2>
        <p className="max-w-2xl text-sm/relaxed text-foreground/70 md:text-base/relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
