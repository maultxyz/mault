import { AnchorLinkButton } from "@/components/guide/anchor-link-button";
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
    <div className="flex flex-col gap-3">
      <div className="group/anchor flex items-center justify-between gap-4">
        <p className="min-w-0 truncate font-heading text-2xs font-medium tracking-widest text-primary uppercase">
          {step} / {eyebrow}
        </p>
        <div className="flex shrink-0 items-center gap-2 font-heading text-2xs text-foreground/70">
          {aside}
          <AnchorLinkButton id={id} className="-my-2" />
        </div>
      </div>
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {heading}
        </h2>
        {children}
      </div>
    </div>
  );
}
