import type { ViewfinderCornersProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";

export function ViewfinderCorners({ className }: ViewfinderCornersProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <span className="absolute top-0 left-0 size-4 border-t-2 border-l-2 border-primary rounded-tl-md" />
      <span className="absolute top-0 right-0 size-4 border-t-2 border-r-2 border-primary rounded-tr-md" />
      <span className="absolute bottom-0 left-0 size-4 border-b-2 border-l-2 border-primary rounded-bl-md" />
      <span className="absolute right-0 bottom-0 size-4 border-r-2 border-b-2 border-primary rounded-br-md" />
    </div>
  );
}
