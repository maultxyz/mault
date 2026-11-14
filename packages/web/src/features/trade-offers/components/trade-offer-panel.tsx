import type { TradeOfferPanelProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";

export function TradeOfferPanel({
  step,
  title,
  description,
  headingId,
  className,
  children,
}: TradeOfferPanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col gap-3 rounded-card bg-card p-4 md:p-2.5", className)}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          aria-hidden
        >
          {step}
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 id={headingId} className="text-sm font-semibold">
            {title}
          </h3>
          <p className="text-xs text-foreground/70">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
