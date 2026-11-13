import type { DisplayHeadlineProps } from "@/lib/interfaces/display-headline";

export function DisplayHeadline({ title, subtitle }: DisplayHeadlineProps) {
  return (
    <p className="text-3xl font-bold tracking-tight text-foreground md:text-xl">
      {title}
      {subtitle && (
        <>
          <br />
          <span className="text-foreground/70">{subtitle}</span>
        </>
      )}
    </p>
  );
}
