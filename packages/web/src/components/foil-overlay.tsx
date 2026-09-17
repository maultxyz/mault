import { cn } from "@/lib/utils";

export function FoilOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-10", className)}
    >
      <div className="absolute inset-0 animate-foil-sheen bg-foil-sheen bg-[length:250%_250%] bg-no-repeat mix-blend-overlay" />
    </div>
  );
}
