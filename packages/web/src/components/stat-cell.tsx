import type { StatCellProps } from "@/lib/interfaces/stat-group";
import { cn } from "@/lib/utils";

export function StatCell({ label, value, className }: StatCellProps) {
  return (
    <div className={cn("p-3", className)}>
      <p className="mb-0.5 text-xs text-foreground/70">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
