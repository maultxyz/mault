import type { MarketingRuleProps } from "@/lib/interfaces/marketing-rule";
import { cn } from "@/lib/utils";

export function MarketingRule({
  lead,
  label,
  aside,
  className,
}: MarketingRuleProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-4 border-b pb-3 font-heading text-2xs font-medium tracking-widest text-foreground/70 uppercase",
        className,
      )}
    >
      <p className="min-w-0 truncate">
        <span className="text-primary">{lead}</span>
        {label && <> / {label}</>}
      </p>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}
