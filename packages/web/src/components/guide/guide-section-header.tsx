import { AnchorLinkButton } from "@/components/guide/anchor-link-button";
import { MarketingRule } from "@/components/marketing-rule";
import type { GuideSectionHeaderProps } from "@/lib/interfaces/guide";

export function GuideSectionHeader({
  id,
  step,
  eyebrow,
  heading,
  aside,
  children,
}: GuideSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="group/anchor">
        <MarketingRule
          lead={step}
          label={eyebrow}
          aside={
            <>
              {aside}
              <AnchorLinkButton id={id} className="-my-2" />
            </>
          }
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
