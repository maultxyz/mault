import type { LandingSectionHeaderProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";

export function LandingSectionHeader({
  eyebrow,
  heading,
  subtitle,
  centered = false,
}: LandingSectionHeaderProps) {
  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
      <p className="font-heading text-sm font-semibold tracking-wider text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
        {heading}
      </h2>
      <p className="mt-3 text-sm/relaxed text-foreground/70 md:text-base/relaxed">
        {subtitle}
      </p>
    </div>
  );
}
