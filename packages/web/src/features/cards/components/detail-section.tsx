import type { DetailSectionProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";

export function DetailSection({
  title,
  children,
  className,
}: DetailSectionProps) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-foreground/70">
        {title}
      </h3>
      {children}
    </section>
  );
}
