import type { StatCellProps } from "@/lib/interfaces/stat-group";
import { cn } from "@/lib/utils";

export function StatCell({ label, value, className }: StatCellProps) {
  return (
    <div className={cn("p-3", className)}>
      <p className="text-2xs font-medium text-foreground/70 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
