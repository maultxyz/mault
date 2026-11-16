import type { PageIntroProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function PageIntro({
  title,
  description,
  isPageHeading = false,
  className,
}: PageIntroProps) {
  const Heading = isPageHeading ? "h1" : "h2";
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <Heading className="font-heading text-lg font-semibold">{title}</Heading>
      {description && (
        <p className="text-xs text-foreground/70">{description}</p>
      )}
    </div>
  );
}
