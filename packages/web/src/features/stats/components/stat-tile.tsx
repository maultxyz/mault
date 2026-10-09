import type { StatTileProps } from "@/lib/interfaces/stats";

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="truncate text-xs text-foreground/70">{label}</p>
      <p className="truncate font-heading text-xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="truncate text-2xs text-foreground/70 tabular-nums">
          {hint}
        </p>
      )}
    </div>
  );
}
