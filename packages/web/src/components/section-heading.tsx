import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  heading,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: ReactNode;
  heading: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>
      )}
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        {heading}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm/relaxed text-foreground/70 md:text-base/relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
