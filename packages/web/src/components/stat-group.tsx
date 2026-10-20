import type { StatGroupProps } from "@/lib/interfaces/stat-group";
import { cn } from "@/lib/utils";

export function StatGroup({
  heading,
  tiles,
  live,
  gridClassName = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
}: StatGroupProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-input bg-input/20 dark:bg-input/30">
      <div className="flex items-center gap-1.5 border-b border-input px-2 py-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
          {heading}
        </p>
        {live !== undefined && (
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              live
                ? "bg-success animate-pulse motion-reduce:animate-none"
                : "bg-muted-foreground/40",
            )}
          />
        )}
      </div>
      <div className={cn("-mr-px -mb-px grid", gridClassName)}>
        {tiles.map((tile) => (
          <div key={tile.key} className="border-r border-b border-input p-2">
            <p className="text-2xs font-medium uppercase tracking-wide text-foreground/70">
              {tile.label}
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {tile.value ?? "-"}
            </p>
            {tile.detail !== undefined && (
              <p className="text-2xs text-foreground/70">
                {tile.detail ?? "-"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
