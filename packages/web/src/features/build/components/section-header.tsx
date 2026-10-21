import { MarketingRule } from "@/components/marketing-rule";
import { AnchorLinkButton } from "@/features/build/components/anchor-link-button";
import type { BuildSectionHeaderProps } from "@/lib/interfaces/build";

export function BuildSectionHeader({
  id,
  step,
  eyebrow,
  heading,
  children,
}: BuildSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="group/anchor">
        <MarketingRule
          lead={step}
          label={eyebrow}
          aside={<AnchorLinkButton id={id} className="-my-2" />}
        />
      </div>
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {heading}
        </h2>
        {children}
      </div>
    </div>
  );
}
