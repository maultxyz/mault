import type { PageIntroProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function PageIntro({ title, description, className }: PageIntroProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="text-xs text-foreground/70">{description}</p>
    </div>
  );
}
