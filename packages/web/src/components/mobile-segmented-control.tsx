import type { MobileSegmentedControlProps } from "@/lib/interfaces/nav";
import { cn } from "@/lib/utils";

export function MobileSegmentedControl<T extends string>({
  items,
  value,
  onChange,
  label,
}: MobileSegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex w-full gap-1 rounded-full bg-muted p-1"
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-full px-3 text-sm font-semibold transition-colors motion-reduce:transition-none",
              active
                ? "bg-foreground text-background"
                : "text-foreground/70 active:bg-background/60",
            )}
          >
            {item.label}
            {!!item.badge && (
              <span className="min-w-4 rounded-full bg-destructive-strong px-1 text-2xs leading-4 font-semibold text-white tabular-nums">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
