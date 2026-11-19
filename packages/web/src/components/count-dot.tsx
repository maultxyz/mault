import type { CountDotProps } from "@/lib/interfaces/count-dot";

export function CountDot({ count }: CountDotProps) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground"
    >
      {count}
    </span>
  );
}
